import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { SKALECreate2Factory } from '../src/SKALECreate2Factory'
// import { ethers } from 'hardhat'

const deployEntryPoint: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {

  const provider = hre.ethers.provider
  const from = await provider.getSigner().getAddress()
  /** Commented Out due to Unknown Cryptic Error - Also not required */
  // await new SKALECreate2Factory(provider).deployFactory()

  const senderCreatorImpl = await hre.deployments.deploy(
    'SenderCreator', {
      from,
      args: [],
      gasLimit: 6e6,
      deterministicDeployment: true
    })
  console.log('==senderCreator addr=', senderCreatorImpl.address)

  const ret = await hre.deployments.deploy(
    'EntryPoint', {
      from,
      args: [senderCreatorImpl.address],
      gasLimit: 6e6,
      deterministicDeployment: true
    })
  console.log('==entrypoint addr=', ret.address)
/*
  const entryPointAddress = ret.address
  const w = await hre.deployments.deploy(
    'SimpleAccount', {
      from,
      args: [entryPointAddress, from],
      gasLimit: 2e6,
      deterministicDeployment: true
    })

  console.log('== wallet=', w.address)

  const t = await hre.deployments.deploy('TestCounter', {
    from,
    deterministicDeployment: true
  })
  console.log('==testCounter=', t.address)
  */
}

export default deployEntryPoint
