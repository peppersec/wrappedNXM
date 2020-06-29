import { NxmTokenInstance, WNxmInstance } from '../types/truffle-contracts';
const NXMToken = artifacts.require('NXMToken');
const wNXMToken = artifacts.require('wNXM');

import chai from 'chai';
const { expect } = require('chai');
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
chai.use(require('chai-as-promised'));
chai.should();

contract('NXMToken', (accounts) => {
  let NXM: NxmTokenInstance;
  let wNXM: WNxmInstance;
  const operator = accounts[0];
  const member = accounts[1];

  before(async () => {
    NXM = await NXMToken.deployed();
    wNXM = await wNXMToken.deployed();
  });

  it('check NXM', async () => {
    const operatorFromContract = await NXM.operator();
    operatorFromContract.should.be.equal(operator);

    const totalSupply = await NXM.totalSupply();
    const operatorBalance = await NXM.balanceOf(operator);
    expect(totalSupply).to.be.a.bignumber.that.equals(operatorBalance);

    const isWhitelisted = await NXM.whiteListed(member);
    isWhitelisted.should.be.true;
  });
});
