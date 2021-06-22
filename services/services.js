const axios = require("axios");

const createFile = async (body, files) => {
    const options = {
        outputName: "ALL_LICENSE"
    };
    if (body.outputName) {
        options.outputName = body.outputName;
    }
    let dependencies;
    if (files) {
        const file = files.File.data.toString();
        const parsed = JSON.parse(file)
        dependencies = parsed["dependencies"];
    }
    let bigString = "";
    if (dependencies) {
        for (const oneDependencies of Object.keys(dependencies)) {
            let url = `https://www.npmjs.com/package/${oneDependencies}`;
            const npmRES = await axios.get(url);
            const startParse = npmRES.data.match(/(Weekly Downloads.*<\/p>.*Last publish)/g);
            const noTags = startParse[0].replace(/<[^<]*>/g, " ").replace(/<\/[^<]*>/g, "");
            //console.log(noTags);
            const homePage = noTags.split("Homepage")[1].split("Repository")[0].trim();
            const linkToRepo = noTags.split("Git")[1].split("Last publish")[0].trim();
            if (homePage.startsWith("github.com") || linkToRepo.startsWith("github.com")) {
                const correctLink = homePage.startsWith("github.com") ? homePage : linkToRepo;
                const beforeHash = correctLink.split("#")[0];
                const link = beforeHash.split("github.com/")[1];
                res = await getLicense(link);
                if (res && res.data) {
                    bigString += `${oneDependencies}\n${correctLink}\n\n`;
                    bigString += `${res.data}\n\n\n`;
                    //console.log(`OK ${linkToRepo}`);
                } else {
                    console.log(`NOT OK ${linkToRepo}`);
                }
            } else {
                console.error(`CANT GET ${oneDependencies} ${linkToRepo}`);
            }
        }
        return bigString;
    } else {
        return { text: "noDependencies !" }
    }
};


const getLicense = async (link) => {
    let log = false;
    let res;
    res = await axios.get(`https://github.com/${link}`).catch((err) => {
        if (log) {
            console.log(`-> ${link} not found`);
        }
    });
    const match = res.data.match(/License<\/h3>[^\/]*href="[^"]*"/gm);
    let url;
    if (match) {
        url = match[0].replace(/License<\/h3>[^\/]*href="([^"]*)"/gm, "$1");
        url = url.split("/");
        let correctUrl = `https://raw.githubusercontent.com/${link}/${url[url.length - 2]}/${url[url.length - 1]}`;
        console.log(correctUrl);
        res = await axios.get(correctUrl).catch(async (err) => {
            if (log) {
                console.log(`-> ${link} not found`);
            }
        });
        return res;
    } else {
        res = null;
        return res;
    }
}

module.exports = {
    createFile
};