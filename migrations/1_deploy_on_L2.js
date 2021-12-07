// Right click on the script name and hit "Run" to execute
async function main() {
  try {
    console.log("Running deployWithEthers script...");
    let tx;

    const deployerAddress = "";

    // // Optimism
    const l1USXContractAddress = "0x0a5e677a6a24b2f1a2bf4f3bffc443231d2fdec8";
    const l2USXContractAddress = "0xbfD291DA8A403DAAF7e5E9DC1ec0aCEaCd4848B9";
    const l2msdControllerAddress = "0x9E8B68E17441413b26C2f18e741EAba69894767c";
    // const l2RouterAddress = "0x5288c571Fd7aD117beA99bF60FE0846C4E84F933";
    let l2CrossDomainMessengerAddress = "0x4200000000000000000000000000000000000007";
    let l1USXGatewayProxyAddress = "0xC5b1EC605738eF73a4EFc562274c1c0b6609cF59";
    let proxyAdminAddress = "0x1C4d5eCFBf2AF57251f20a524D0f0c1b4f6ED1C9";
    let l2USXGatewayImplAddress = "0x0F18940dB877D3fd173AF087349Ee87B853AA029";
    let l2USXGatewayProxyAddress = "0xc76cbFbAfD41761279E3EDb23Fd831Ccb74D5D67";
    let l1GovernanceRelayAddress = "0xdEAD000000000000000042069420694206942069";
    let l2GovernanceRelayImplAddress = "0xdEAD000000000000000042069420694206942069";
    let l2GovernanceRelayProxyAddress = "0xdEAD000000000000000042069420694206942069";
    // Optimism Test
    // const l1USXContractAddress = "0xF76eAd4da04BbeB97d29F83e2Ec3a621d0FB3c6e";
    // const l2USXContractAddress = "0xab7020476D814C52629ff2e4cebC7A8cdC04F18E";
    // const l2msdControllerAddress = "0x16E7F5705967B2153473b8411D3faFe257262330";
    // // const l2RouterAddress = "0x5288c571Fd7aD117beA99bF60FE0846C4E84F933";
    // let l2CrossDomainMessengerAddress = "0x4200000000000000000000000000000000000007";
    // let l1USXGatewayProxyAddress = "0x40E862341b2416345F02c41Ac70df08525150dC7";
    // let proxyAdminAddress = "0x5c3712FAa40c1a9C00481bAb0EE7b68C03A7855C";
    // let l2USXGatewayImplAddress = "0x512c242dcBe915ebaD24f9BDcdBBcEFC3dCa2117";
    // let l2USXGatewayProxyAddress = "0xB4d37826b14Cd3CB7257A2A5094507d701fe715f";
    // let l1GovernanceRelayAddress = "0xE5ecB56521B4BF6E38662B2BD85143F5c56cAE90";
    // let l2GovernanceRelayImplAddress = "0x29bdd4E48643Fd23BB6944D7252e5b696f5f50A6";
    // let l2GovernanceRelayProxyAddress = "0x57f76F87CE81638561070389f16D7833080c11a8";

    // 'web3Provider' is a remix global variable object
    const signer = new ethers.providers.Web3Provider(web3Provider).getSigner();

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

    // 1.0 Deploy L2 governance rely implementation contract.
    const governanceRelayContractName = "L2GovernanceRelay";
    const governanceRelayPath = `browser/artifacts/contracts/l2/${governanceRelayContractName}.sol/${governanceRelayContractName}.json`;
    const governanceRelayMetadata = JSON.parse(
      await remix.call("fileManager", "getFile", governanceRelayPath)
    );

    let l2governanceRelayInitArgs = [
      l2CrossDomainMessengerAddress,
      l1GovernanceRelayAddress
    ];
    if (!l2GovernanceRelayImplAddress) {
      console.log("U r going to deploy governance relay implementation contract!");
      // Create an instance of a Contract Factory
      const governanceRelayImplFactory = new ethers.ContractFactory(governanceRelayMetadata.abi, governanceRelayMetadata.bytecode, signer);
      const governanceRelayImpl = await governanceRelayImplFactory.deploy(...l2governanceRelayInitArgs);
      // The contract is NOT deployed yet; we must wait until it is mined
      await governanceRelayImpl.deployed();
      l2GovernanceRelayImplAddress = governanceRelayImpl.address;
    }
    console.log("Governance relay implementation contract address: ", l2GovernanceRelayImplAddress);
    const governanceRelayInIface = new ethers.utils.Interface(governanceRelayMetadata.abi);

    // 1.1 Deploys L1 governance rely proxy contract.
    const proxyName = "TransparentUpgradeableProxy";
    const proxyArtifactsPath = `browser/artifacts/@openzeppelin/contracts/proxy/${proxyName}.sol/${proxyName}.json`;
    const proxyMetadata = JSON.parse(
      await remix.call("fileManager", "getFile", proxyArtifactsPath)
    );

    if (!l2GovernanceRelayProxyAddress) {
      console.log("Going to deploy governance relay proxy contract!");
      const governanceRelayInitData = governanceRelayInIface.encodeFunctionData("initialize", [...l2governanceRelayInitArgs]);
      console.log("initData is: ", governanceRelayInitData);

      const governanceRelayProxyFactory = new ethers.ContractFactory(proxyMetadata.abi, proxyMetadata.bytecode, signer);
      const governanceRelayProxy = await governanceRelayProxyFactory.deploy(l2GovernanceRelayImplAddress, proxyAdminAddress, governanceRelayInitData);
      await governanceRelayProxy.deployed();
      l2GovernanceRelayProxyAddress = governanceRelayProxy.address;
    }
    console.log("L2 governance realy proxy contract address: ", l2GovernanceRelayProxyAddress);

    // 2.0 Deploys L2 USX gateway implementation contract
    let l2USXGatewayInitArgs = [
      l2CrossDomainMessengerAddress,
      l2USXContractAddress,
      l1USXContractAddress,
      l1USXGatewayProxyAddress,
      l2msdControllerAddress
    ];
    const l2USXGatewayContractName = "L2USXTokenBridge";
    const l2USXGatewayPath = `browser/artifacts/contracts/l2/${l2USXGatewayContractName}.sol/${l2USXGatewayContractName}.json`;
    const l2USXGatewayMetadata = JSON.parse(
      await remix.call("fileManager", "getFile", l2USXGatewayPath)
    );
    if (!l2USXGatewayImplAddress) {
      console.log("U r going to deploy L2 USX gateway implementation contract!");
      // Create an instance of a Contract Factory
      const l2USXGatewayImplFactory = new ethers.ContractFactory(l2USXGatewayMetadata.abi, l2USXGatewayMetadata.bytecode, signer);
      const l2USXGatewayImpl = await l2USXGatewayImplFactory.deploy(...l2USXGatewayInitArgs);
      // The contract is NOT deployed yet; we must wait until it is mined
      await l2USXGatewayImpl.deployed();
      l2USXGatewayImplAddress = l2USXGatewayImpl.address;
    }
    console.log("L2 USX gateway implementation contract address: ", l2USXGatewayImplAddress);
    const l2USXGatewayInIface = new ethers.utils.Interface(l2USXGatewayMetadata.abi);

    // 2.1 Deploys L2 USX gateway proxy contract
    if (!l2USXGatewayProxyAddress) {
      console.log("Going to deploy L2 USX gateway proxy contract!");
      const l2USXGatewayInitData = l2USXGatewayInIface.encodeFunctionData("initialize", [...l2USXGatewayInitArgs]);
      console.log("l2 USX Gateway initData is: ", l2USXGatewayInitData);

      const l2USXGatewayProxyFactory = new ethers.ContractFactory(proxyMetadata.abi, proxyMetadata.bytecode, signer);
      const l2USXGatewayProxy = await l2USXGatewayProxyFactory.deploy(l2USXGatewayImplAddress, proxyAdminAddress, l2USXGatewayInitData);
      await l2USXGatewayProxy.deployed();
      l2USXGatewayProxyAddress = l2USXGatewayProxy.address;
    }
    console.log("L2 USX Gateway proxy contract address: ", l2USXGatewayProxyAddress);

    console.log("\n");
    console.log("Please run another script to deploy USX gateway on the L1");
    console.log("\n");

    console.log("Finish!");
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
