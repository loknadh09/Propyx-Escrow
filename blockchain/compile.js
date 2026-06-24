const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractsDir = path.join(__dirname, 'contracts');
const srcPath = path.join(contractsDir, 'Escrow.sol');
const source = fs.readFileSync(srcPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'Escrow.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'],
      },
    },
  },
};

function compile() {
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors) {
    const hasError = output.errors.some(e => e.severity === 'error');
    console.error('Solc errors:');
    output.errors.forEach(e => console.error(e.formattedMessage || e.message));
    if (hasError) process.exit(1);
  }

  const contractName = 'Escrow';
  const contractOutput = output.contracts['Escrow.sol'][contractName];
  const abi = contractOutput.abi;
  const bytecode = '0x' + contractOutput.evm.bytecode.object;
  const deployed = '0x' + contractOutput.evm.deployedBytecode.object;

  const artifactsDir = path.join(__dirname, 'artifacts', 'contracts', 'Escrow.sol');
  fs.mkdirSync(artifactsDir, { recursive: true });

  const artifact = {
    _format: 'hh-sol-artifact-1',
    contractName,
    sourceName: 'contracts/Escrow.sol',
    abi,
    bytecode,
    deployedBytecode: deployed,
    linkReferences: {},
    deployedLinkReferences: {},
  };

  fs.writeFileSync(path.join(artifactsDir, `${contractName}.json`), JSON.stringify(artifact, null, 2));
  console.log('Wrote artifact:', path.join(artifactsDir, `${contractName}.json`));
}

compile();
