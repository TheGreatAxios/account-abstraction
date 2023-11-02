import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import { HardhatUserConfig } from 'hardhat/config'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-etherscan'
import dotenv from 'dotenv'
import 'solidity-coverage'

import * as fs from 'fs'

dotenv.config();

const mnemonicFileName = process.env.MNEMONIC_FILE ?? `${process.env.HOME}/.secret/testnet-mnemonic.txt`
let mnemonic = 'test '.repeat(11) + 'junk'
if (fs.existsSync(mnemonicFileName)) { mnemonic = fs.readFileSync(mnemonicFileName, 'ascii') }

function getNetwork1 (url: string): { url: string, accounts: { mnemonic: string } } {
  return {
    url,
    accounts: { mnemonic }
  }
}

function getNetwork (name: string): { url: string, accounts: { mnemonic: string } } {
  return getNetwork1(`https://${name}.infura.io/v3/${process.env.INFURA_ID}`)
  // return getNetwork1(`wss://${name}.infura.io/ws/v3/${process.env.INFURA_ID}`)
}

const optimizedComilerSettings = {
  version: '0.8.17',
  settings: {
    optimizer: { enabled: true, runs: 1000000 },
    viaIR: true
  }
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{
      version: '0.8.15',
      settings: {
        optimizer: { enabled: true, runs: 1000000 }
      }
    }],
    overrides: {
      'contracts/core/EntryPoint.sol': optimizedComilerSettings,
      'contracts/samples/SimpleAccount.sol': optimizedComilerSettings
    }
  },
  namedAccounts: {
    deployer: 0 
  },
  networks: {
    // dev: { url: 'http://localhost:8545' },
    // github action starts localgeth service, for gas calculations
    localgeth: { url: 'http://localgeth:8545' },
    // goerli: getNetwork('goerli'),
    // sepolia: getNetwork('sepolia'),
    // proxy: getNetwork1('http://localhost:8545'),
    'nebula-staging': {
      url: 'https://staging-v3.skalenodes.com/v1/staging-faint-slimy-achird',
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  mocha: {
    timeout: 10000
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  deterministicDeployment: {
    "503129905": {
      factory: "0x647a4a371397dfca08829ef628641d7330bb0f07",
      deployer: "0xc61b4ff243a7556729a0f081b4389adf19bfe74b",
      funding: "10000",
      signedTx: "0xf9012e80a0e7d34572731aaeb00ab814061bba3f57e6fe8ec59c6571f97e8becf659f0a4af830186a08080b8c160b28061000f600039806000f350fe6040516313f44d1081523360208201526040810160405260006020826024601c850173d2002000000000000000000000000000000000d27ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa15156061578081fd5b81511515606c578081fd5b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601915081602082378035828234f580151560a6578182fd5b8082525050506014600cf31ba0f90146752b5820c0905eebac1f1c79c01378a12312c9ae23da7c301870644036a079e1582bdd74f38a5a1797718bfd21c7ef8d6c736b2ae738de917baa96a476e7",
    } 
  }
}

// coverage chokes on the "compilers" settings
if (process.env.COVERAGE != null) {
  // @ts-ignore
  config.solidity = config.solidity.compilers[0]
}

export default config
