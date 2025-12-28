import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy TestUSD
  const TestUSD = await ethers.getContractFactory("TestUSD");
  const testUSD = await TestUSD.deploy();

  await testUSD.waitForDeployment();

  const address = await testUSD.getAddress();
  console.log("TestUSD deployed to:", address);

  // Log contract info
  console.log("\n--- Contract Info ---");
  console.log("Name:", await testUSD.name());
  console.log("Symbol:", await testUSD.symbol());
  console.log("Decimals:", await testUSD.decimals());
  console.log("Initial Supply:", ethers.formatEther(await testUSD.totalSupply()), "TUSD");
  console.log("Deployer Balance:", ethers.formatEther(await testUSD.balanceOf(deployer.address)), "TUSD");

  console.log("\n--- Add to .env ---");
  console.log(`NEXT_PUBLIC_TUSD_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
