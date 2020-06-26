# Wrapped NXM

Describes the technical specifications to turn NXM into wNXM, a freely tradable ERC-20.  
## Objectives
Allow anyone, not just members of Nexus Mutual, to get direct exposure to NXM.  
Do so in a trustless way.  

## Developer Tools 🛠️

- [Truffle](https://trufflesuite.com/)
- [TypeChain](https://github.com/ethereum-ts/TypeChain)
- [Openzeppelin Contracts](https://openzeppelin.com/contracts/)

## Start

Create `.infura` and `.secret` files. Install the dependencies:

```bash
$ yarn install
```

## Tests

```bash
$ yarn test
```

## Deploying

Deploy to Kovan:

```bash
$ NETWORK=kovan yarn deploy
```

## Verifying Contract Code

```bash
$ NETWORK=kovan yarn run verify wrappedNXM
```
