
// Right click on the script name and hit "Run" to execute
async function main() {
  try {
    console.log("Running deployWithEthers script...");
    let tx;

    // // Mainnet
    const l1USXContractAddress = "0x0a5e677a6a24b2f1a2bf4f3bffc443231d2fdec8";
    const l2USXContractAddress = "0xbfD291DA8A403DAAF7e5E9DC1ec0aCEaCd4848B9";
    const l1MessengerAddress = "0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1";
    // const inboxAddress = "0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f";
    let l2USXGatewayProxyAddress = "0xc76cbFbAfD41761279E3EDb23Fd831Ccb74D5D67";
    let proxyAdminAddress = "0x4FF0455bcfBB5886607c078E0F43Efb5DE34DeF4";
    let escrowImplContractAddress = "0x5f7CA155cd53f552e60f8D1B088D6e4CA5885c35";
    let escrowProxyContractAddress = "0x40BE37096ce3b8A2E9eC002468Ab91071501C499";
    let l1USXGatewayImplAddress = "0x1EE116B869eCc7cd13C629a8a2Ae39Fa361265CF";
    let l1USXGatewayProxyAddress = "0xC5b1EC605738eF73a4EFc562274c1c0b6609cF59";
    let l2GovernanceRelayAddress = "0xdEAD000000000000000042069420694206942069";
    let l1GovernanceRelayImplAddress = "0xdEAD000000000000000042069420694206942069";
    let l1GovernanceRelayProxyAddress = "0xdEAD000000000000000042069420694206942069";
    // Kovan
    // const l1USXContractAddress = "0xF76eAd4da04BbeB97d29F83e2Ec3a621d0FB3c6e";
    // const l2USXContractAddress = "0xab7020476D814C52629ff2e4cebC7A8cdC04F18E";
    // const l1MessengerAddress = "0x4361d0F75A0186C05f971c566dC6bEa5957483fD";
    // // const inboxAddress = "0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f";
    // let l2USXGatewayProxyAddress = "0xB4d37826b14Cd3CB7257A2A5094507d701fe715f";

    // let proxyAdminAddress = "0xca64293ed5C3F3CdF110184d6E8fDDBfb0fa1728";
    // let escrowImplContractAddress = "0x9903Cd2f3d21ff9C85e12590c802B4F852dD44f8";
    // let escrowProxyContractAddress = "0x024Fa49a548e3496A0468b0f71cD3A4514B5D192";
    // let l1USXGatewayImplAddress = "0xae71BB4a2A10D1a252A057c316225b0BC22e2392";
    // let l1USXGatewayProxyAddress = "0x40E862341b2416345F02c41Ac70df08525150dC7";
    // let l2GovernanceRelayAddress = "0x57f76F87CE81638561070389f16D7833080c11a8";
    // let l1GovernanceRelayImplAddress = "0xfa901Da254c0964987B8e7FF814dCF01e9Ed93f7";
    // let l1GovernanceRelayProxyAddress = "0xE5ecB56521B4BF6E38662B2BD85143F5c56cAE90";

    // 'web3Provider' is a remix global variable object
    const signer = new ethers.providers.Web3Provider(web3Provider).getSigner();
    let from = await signer.getAddress();

    // 0. Deploys proxy admin.
    const proxyAdminName = "ProxyAdmin";
    const proxyAdminArtifactsPath = `browser/artifacts/contracts/library/${proxyAdminName}.sol/${proxyAdminName}.json`;
    const proxyAdminMetadata = JSON.parse(
      await remix.call("fileManager", "getFile", proxyAdminArtifactsPath)
    );

    if (!proxyAdminAddress) {
      console.log("U r going to deploy proxy admin");
      // Create an instance of a Contract Factory
      const proxyAdminFactory = new ethers.ContractFactory(proxyAdminMetadata.abi, proxyAdminMetadata.bytecode, signer);
      const proxyAdmin = await proxyAdminFactory.deploy();
      // The contract is NOT deployed yet; we must wait until it is mined
      await proxyAdmin.deployed();
      proxyAdminAddress = proxyAdmin.address;
    }
    console.log("proxy admin contract address: ", proxyAdminAddress);

    // 1.0 Deploys escrow implementation contract
    const escrowContractName = "L1Escrow";
    const escrowPath = `browser/artifacts/contracts/l1/${escrowContractName}.sol/${escrowContractName}.json`;
    const escrowMetadata = JSON.parse(
      await remix.call("fileManager", "getFile", escrowPath)
    );
    if (!escrowImplContractAddress) {
      console.log("U r going to deploy escrow implementation contract!");
      // Create an instance of a Contract Factory
      const escrowImplFactory = new ethers.ContractFactory(escrowMetadata.abi, escrowMetadata.bytecode, signer);
      const escrowImpl = await escrowImplFactory.deploy();
      // The contract is NOT deployed yet; we must wait until it is mined
      await escrowImpl.deployed();
      escrowImplContractAddress = escrowImpl.address;
    }
    console.log("Escrow implementation contract address: ", escrowImplContractAddress);
    const escrowInIface = new ethers.utils.Interface(escrowMetadata.abi);

    // 1.1 Deploys escrow proxy contract
    const proxyName = "TransparentUpgradeableProxy";
    const proxyArtifactsPath = `browser/artifacts/@openzeppelin/contracts/proxy/${proxyName}.sol/${proxyName}.json`;
    const proxyMetadata = JSON.parse(
      await remix.call("fileManager", "getFile", proxyArtifactsPath)
    );

    if (!escrowProxyContractAddress) {
      console.log("Going to deploy escrow proxy contract!");
      const escrowInitData = escrowInIface.encodeFunctionData("initialize", []);
      console.log("initData is: ", escrowInitData);

      const escrowProxyFactory = new ethers.ContractFactory(proxyMetadata.abi, proxyMetadata.bytecode, signer);
      const escrowProxy = await escrowProxyFactory.deploy(escrowImplContractAddress, proxyAdminAddress, escrowInitData);
      await escrowProxy.deployed();
      escrowProxyContractAddress = escrowProxy.address;
    }
    console.log("Escrow proxy contract address: ", escrowProxyContractAddress);
    let escrow = new ethers.Contract(escrowProxyContractAddress, escrowMetadata.abi, signer);


    // 2. Get current nonce to calculate contract address of next deployed contract.
    // cause will deploy implementation and proxy contract.
    let nonce = await signer.getTransactionCount() + 1;
    console.log("Deployer nonce is: ", nonce);
    let addressOfNextDeployedContract = ethers.utils.getContractAddress({ from, nonce });
    console.log("Next deploy contract L1 governance relay address is: ", addressOfNextDeployedContract);

    nonce = await signer.getTransactionCount() + 3;
    console.log("Deployer nonce is: ", nonce);
    addressOfNextDeployedContract = ethers.utils.getContractAddress({ from, nonce });
    console.log("Next deploy contract L1 USX gateway address is: ", addressOfNextDeployedContract);

    console.log("\nRun another script to deploy contract on the L2\n");
    // return;

    // 3.0 Deploy L1 governance rely implementation contract.
    const governanceRelayContractName = "L1GovernanceRelay";
    const governanceRelayPath = `browser/artifacts/contracts/l1/${governanceRelayContractName}.sol/${governanceRelayContractName}.json`;
    const governanceRelayMetadata = JSON.parse(
      await remix.call("fileManager", "getFile", governanceRelayPath)
    );

    let l1governanceRelayInitArgs = [
      l2GovernanceRelayAddress,
      l1MessengerAddress,
    ];
    if (!l1GovernanceRelayImplAddress) {
      console.log("U r going to deploy governance relay implementation contract!");
      // Create an instance of a Contract Factory
      const governanceRelayImplFactory = new ethers.ContractFactory(governanceRelayMetadata.abi, governanceRelayMetadata.bytecode, signer);
      const governanceRelayImpl = await governanceRelayImplFactory.deploy(...l1governanceRelayInitArgs);
      // The contract is NOT deployed yet; we must wait until it is mined
      await governanceRelayImpl.deployed();
      l1GovernanceRelayImplAddress = governanceRelayImpl.address;
    }
    console.log("Governance relay implementation contract address: ", l1GovernanceRelayImplAddress);
    const governanceRelayInIface = new ethers.utils.Interface(governanceRelayMetadata.abi);

    // 3.1 Deploys L1 governance rely proxy contract.
    if (!l1GovernanceRelayProxyAddress) {
      console.log("Going to deploy governance relay proxy contract!");
      const governanceRelayInitData = governanceRelayInIface.encodeFunctionData("initialize", [...l1governanceRelayInitArgs]);
      console.log("initData is: ", governanceRelayInitData);

      const governanceRelayProxyFactory = new ethers.ContractFactory(proxyMetadata.abi, proxyMetadata.bytecode, signer);
      const governanceRelayProxy = await governanceRelayProxyFactory.deploy(l1GovernanceRelayImplAddress, proxyAdminAddress, governanceRelayInitData);
      await governanceRelayProxy.deployed();
      l1GovernanceRelayProxyAddress = governanceRelayProxy.address;
    }
    console.log("L1 governance realy proxy contract address: ", l1GovernanceRelayProxyAddress);

    // 4.0 Deploys L1 USX gateway implementation contract
    let l1USXGatewayInitArgs = [
      l1USXContractAddress,
      l2USXGatewayProxyAddress,
      l2USXContractAddress,
      l1MessengerAddress,
      escrowProxyContractAddress
    ];
    const l1USXGatewayContractName = "L1USXTokenBridge";
    const l1USXGatewayPath = `browser/artifacts/contracts/l1/${l1USXGatewayContractName}.sol/${l1USXGatewayContractName}.json`;
    const l1USXGatewayMetadata = JSON.parse(
      await remix.call("fileManager", "getFile", l1USXGatewayPath)
    );
    if (!l1USXGatewayImplAddress) {
      console.log("U r going to deploy L1 USX gateway implementation contract!");
      // Create an instance of a Contract Factory
      const l1USXGatewayImplFactory = new ethers.ContractFactory(l1USXGatewayMetadata.abi, l1USXGatewayMetadata.bytecode, signer);
      const l1USXGatewayImpl = await l1USXGatewayImplFactory.deploy(...l1USXGatewayInitArgs);
      // The contract is NOT deployed yet; we must wait until it is mined
      await l1USXGatewayImpl.deployed();
      l1USXGatewayImplAddress = l1USXGatewayImpl.address;
    }
    console.log("L1 USX gateway implementation contract address: ", l1USXGatewayImplAddress);
    const l1USXGatewayInIface = new ethers.utils.Interface(l1USXGatewayMetadata.abi);

    // 4.1 Deploys L2 USX gateway proxy contract
    if (!l1USXGatewayProxyAddress) {
      console.log("Going to deploy L1 USX gateway proxy contract!");
      const l1USXGatewayInitData = l1USXGatewayInIface.encodeFunctionData("initialize", [...l1USXGatewayInitArgs]);
      console.log("l1 USX Gateway initData is: ", l1USXGatewayInitData);

      const l1USXGatewayProxyFactory = new ethers.ContractFactory(proxyMetadata.abi, proxyMetadata.bytecode, signer);
      const l1USXGatewayProxy = await l1USXGatewayProxyFactory.deploy(l1USXGatewayImplAddress, proxyAdminAddress, l1USXGatewayInitData);
      await l1USXGatewayProxy.deployed();
      l1USXGatewayProxyAddress = l1USXGatewayProxy.address;
    }
    console.log("L1 USX Gateway proxy contract address: ", l1USXGatewayProxyAddress);
    return;

  } catch (e) {
    console.log(e.message);
  }
}

main()
  .then(() => console.log('DONE'))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
