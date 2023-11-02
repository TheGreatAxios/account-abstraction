// from: https://github.com/Arachnid/deterministic-deployment-proxy
import { BigNumber, BigNumberish, ethers, Signer } from 'ethers'
import { arrayify, hexConcat, hexlify, hexZeroPad, keccak256 } from 'ethers/lib/utils'
import { Provider } from '@ethersproject/providers'
import { TransactionRequest } from '@ethersproject/abstract-provider'

export class SKALECreate2Factory {
  factoryDeployed = true

  // from: https://github.com/Arachnid/deterministic-deployment-proxy
  static readonly contractAddress = '0x4e59b44847b379578588920ca78fbf26c0b4956c'
  static readonly factoryTx = '0xf9012e80a0e7d34572731aaeb00ab814061bba3f57e6fe8ec59c6571f97e8becf659f0a4af830186a08080b8c160b28061000f600039806000f350fe6040516313f44d1081523360208201526040810160405260006020826024601c850173d2002000000000000000000000000000000000d27ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa15156061578081fd5b81511515606c578081fd5b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601915081602082378035828234f580151560a6578182fd5b8082525050506014600cf31ba0f90146752b5820c0905eebac1f1c79c01378a12312c9ae23da7c301870644036a079e1582bdd74f38a5a1797718bfd21c7ef8d6c736b2ae738de917baa96a476e7'
  static readonly factoryDeployer = '0x647a4a371397dfca08829ef628641d7330bb0f07'
  static readonly deploymentGasPrice = 100e9
  static readonly deploymentGasLimit = 100000
  static readonly factoryDeploymentFee = (SKALECreate2Factory.deploymentGasPrice * SKALECreate2Factory.deploymentGasLimit).toString()

  constructor (readonly provider: Provider,
    readonly signer = (provider as ethers.providers.JsonRpcProvider).getSigner()) {
  }

  /**
   * deploy a contract using our deterministic deployer.
   * The deployer is deployed (unless it is already deployed)
   * NOTE: this transaction will fail if already deployed. use getDeployedAddress to check it first.
   * @param initCode delpoyment code. can be a hex string or factory.getDeploymentTransaction(..)
   * @param salt specific salt for deployment
   * @param gasLimit gas limit or 'estimate' to use estimateGas. by default, calculate gas based on data size.
   */
  async deploy (initCode: string | TransactionRequest, salt: BigNumberish = 0, gasLimit?: BigNumberish | 'estimate'): Promise<string> {
    await this.deployFactory()
    if (typeof initCode !== 'string') {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      initCode = (initCode as TransactionRequest).data!.toString()
    }

    const addr = SKALECreate2Factory.getDeployedAddress(initCode, salt)
    if (await this.provider.getCode(addr).then(code => code.length) > 2) {
      return addr
    }

    const deployTx = {
      to: SKALECreate2Factory.contractAddress,
      data: this.getDeployTransactionCallData(initCode, salt)
    }
    if (gasLimit === 'estimate') {
      gasLimit = await this.signer.estimateGas(deployTx)
    }

    // manual estimation (its bit larger: we don't know actual deployed code size)
    if (gasLimit === undefined) {
      gasLimit = arrayify(initCode)
        .map(x => x === 0 ? 4 : 16)
        .reduce((sum, x) => sum + x) +
        200 * initCode.length / 2 + // actual is usually somewhat smaller (only deposited code, not entire constructor)
        6 * Math.ceil(initCode.length / 64) + // hash price. very minor compared to deposit costs
        32000 +
        21000

      // deployer requires some extra gas
      gasLimit = Math.floor(gasLimit * 64 / 63)
    }

    const ret = await this.signer.sendTransaction({ ...deployTx, gasLimit })
    await ret.wait()
    if (await this.provider.getCode(addr).then(code => code.length) === 2) {
      throw new Error('failed to deploy')
    }
    return addr
  }

  getDeployTransactionCallData (initCode: string, salt: BigNumberish = 0): string {
    const saltBytes32 = hexZeroPad(hexlify(salt), 32)
    return hexConcat([
      saltBytes32,
      initCode
    ])
  }

  /**
   * return the deployed address of this code.
   * (the deployed address to be used by deploy()
   * @param initCode
   * @param salt
   */
  static getDeployedAddress (initCode: string, salt: BigNumberish): string {
    const saltBytes32 = hexZeroPad(hexlify(salt), 32)
    return '0x' + keccak256(hexConcat([
      '0xff',
      SKALECreate2Factory.contractAddress,
      saltBytes32,
      keccak256(initCode)
    ])).slice(-40)
  }

  // deploy the factory, if not already deployed.
  async deployFactory (signer?: Signer): Promise<void> {
    if (await this._isFactoryDeployed()) {
      return
    }
    await (signer ?? this.signer).sendTransaction({
      to: SKALECreate2Factory.factoryDeployer,
      value: BigNumber.from(SKALECreate2Factory.factoryDeploymentFee)
    })
    await this.provider.sendTransaction(SKALECreate2Factory.factoryTx)
    if (!await this._isFactoryDeployed()) {
      throw new Error('fatal: failed to deploy deterministic deployer')
    }
  }

  async _isFactoryDeployed (): Promise<boolean> {
    if (!this.factoryDeployed) {
      const deployed = await this.provider.getCode(SKALECreate2Factory.contractAddress)
      if (deployed.length > 2) {
        this.factoryDeployed = true
      }
    }
    return this.factoryDeployed
  }
}
