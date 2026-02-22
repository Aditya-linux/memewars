const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const arena = await hre.ethers.deployContract("Arena");

    await arena.waitForDeployment();

    console.log("Arena deployed to:", arena.target);
    const tokenAddress = await arena.token();
    console.log("Token address:", tokenAddress);

    const deploymentData = {
        arena: arena.target,
        token: tokenAddress
    };
    fs.writeFileSync("deployment.json", JSON.stringify(deploymentData, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
