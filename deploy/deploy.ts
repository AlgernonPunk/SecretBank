import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedSecretBank = await deploy("SecretBank", {
    from: deployer,
    log: true,
  });

  console.log(`SecretBank contract deployed at: `, deployedSecretBank.address);
  console.log(`Network: `, hre.network.name);
  console.log(`Deployer: `, deployer);
};
export default func;
func.id = "deploy_secretBank"; // id required to prevent reexecution
func.tags = ["SecretBank"];
