const core = require("@actions/core");
const { Octokit } = require("@octokit/rest");

async function Run(){
    try{
        const [owner, repo] = core.getInput("repository").split("/");
        const pull_number = core.getInput("pr_number");
        const token = core.getInput("token");
        const octokit = new Octokit({ auth: token });

        const pull_request = (await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number,
        })).data;

        if (pull_request.body.indexOf("### 🔗 相关 Issue") !== -1) {
            const pr_body = pull_request.body.replace(/<!--(.|[\r\n])*?-->/g, "").replace(/\r\n/g, "").split("### 🔗 相关 Issue");
            const issues = pr_body[1].split("### 💡 需求背景和解决方案")[0];
            const issues_number = issues.match(/(- )?(([\w\.@\:-~]+)\/([\w\.@\:\-~]+))?#(\d+)/g);

            if (issues_number === null) {
                core.info("Pr编号: " + pull_number + ", 没有检测到关联Issue");
                return;
            }

            issues_number.map(async (issue_number) => {
                if (issue_number.indexOf("/") !== -1) {
                    core.info("Pr编号: " + pull_number + ", 发现关联非本仓库Issue " + issue_number + ", 已跳过");
                    return;
                }

                issue_number = issue_number.replace("- ", "").replace("#", "");
                if (isNaN(Number(issue_number))) {
                    core.warning("Pr编号: " + pull_number + ", Issue编号解析错误！\n" + issue_number)
                    return;
                }
                await octokit.rest.issues.addLabels({
                    owner,
                    repo,
                    issue_number,
                    labels: [ "to be published" ],
                });
                core.info("Pr编号: " + pull_number + ", 关联Issue " + issue_number + ", 已添加标签");
            });
        } else {
            core.info("Pr编号: " + pull_number + ", 未识别到区块, 可能没有根据模板填写");
        }
    }catch (e){
        core.error(e.stack);
        core.setFailed(e.message);
    }
}

Run().then();
