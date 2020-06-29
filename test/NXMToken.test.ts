import { takeSnapshot, revertSnapshot } from '../lib/ganacheHelper';
import { NxmTokenInstance, WNxmInstance } from '../types/truffle-contracts';
const NXMToken = artifacts.require('NXMToken');
const wNXMToken = artifacts.require('wNXM');

import chai from 'chai';
const { expect } = require('chai');
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
chai.use(require('chai-as-promised'));
chai.should();

contract('wNXM', (accounts) => {
  let NXM: NxmTokenInstance;
  let wNXM: WNxmInstance;
  const operator = accounts[0];
  const member = accounts[1];
  let snapshotId: { result: string };
  const memberAmount = new BN(web3.utils.toWei('100', 'ether'));

  before(async () => {
    NXM = await NXMToken.deployed();
    wNXM = await wNXMToken.deployed();
    await NXM.transfer(member, memberAmount, { from: operator });
    await NXM.addToWhiteList(wNXM.address);
    snapshotId = await takeSnapshot();
  });

  describe('#NXM checks', () => {
    it('operator, supply, whitelist, isLockedForMV', async () => {
      const operatorFromContract = await NXM.operator();
      operatorFromContract.should.be.equal(operator);

      const totalSupply = await NXM.totalSupply();
      const operatorBalance = await NXM.balanceOf(operator);
      expect(totalSupply).to.be.a.bignumber.that.equals(
        new BN(operatorBalance).add(memberAmount)
      );

      const isWhitelistedMember = await NXM.whiteListed(member);
      isWhitelistedMember.should.be.true;

      const isWhitelistedWrapper = await NXM.whiteListed(wNXM.address);
      isWhitelistedWrapper.should.be.true;

      const isLockedForMVMember = await NXM.isLockedForMV(member);
      expect(isLockedForMVMember).to.be.a.bignumber.that.equals('0');

      const isLockedForMVWrapper = await NXM.isLockedForMV(wNXM.address);
      expect(isLockedForMVWrapper).to.be.a.bignumber.that.equals('0');
    });
  });

  describe('#wNXM checks', () => {
    it('should have NXM address', async () => {
      const nxm = await wNXM.NXM();
      nxm.should.be.equal(NXM.address);
    });
  });

  describe('#wrap ', () => {
    it('should work', async () => {
      const amountToWrap = memberAmount.div(new BN('2'));

      const wNXMBalanceBefore = await wNXM.balanceOf(member);
      const NXMBalanceBefore = await NXM.balanceOf(member);

      await NXM.approve(wNXM.address, amountToWrap, { from: member });
      const canWrap = await wNXM.canWrap(member, amountToWrap);
      canWrap['0'].should.be.true; // success
      canWrap['1'].should.be.equal(''); // reason
      await wNXM.wrap(amountToWrap, { from: member });

      const wNXMBalanceAfter = await wNXM.balanceOf(member);
      const NXMBalanceAfter = await NXM.balanceOf(member);

      expect(wNXMBalanceAfter).to.be.a.bignumber.that.equals(
        BN(wNXMBalanceBefore).add(amountToWrap)
      );

      expect(NXMBalanceAfter).to.be.a.bignumber.that.equals(
        BN(NXMBalanceBefore).sub(amountToWrap)
      );

      // const canWrap = await wNXM.canWrap(member, amountToWrap) as unknown as { success: Boolean; reason: string };
      // canWrap.success.should.be.true;
      // canWrap.reason.should.be.equal('');
    });
  });

  describe('#unwrap ', () => {
    it('should work', async () => {
      const amountToWrap = memberAmount.div(new BN('2'));

      await NXM.approve(wNXM.address, amountToWrap, { from: member });
      await wNXM.wrap(amountToWrap, { from: member });

      const wNXMBalanceBefore = await wNXM.balanceOf(member);
      const NXMBalanceBefore = await NXM.balanceOf(member);

      const canUnwrap = await wNXM.canUnwrap(member, member, amountToWrap);
      canUnwrap['0'].should.be.true; // success
      canUnwrap['1'].should.be.equal(''); // reason

      await wNXM.unwrap(amountToWrap, { from: member });

      const wNXMBalanceAfter = await wNXM.balanceOf(member);
      const NXMBalanceAfter = await NXM.balanceOf(member);

      expect(wNXMBalanceAfter).to.be.a.bignumber.that.equals(
        BN(wNXMBalanceBefore).sub(amountToWrap)
      );

      expect(NXMBalanceAfter).to.be.a.bignumber.that.equals(
        BN(NXMBalanceBefore).add(amountToWrap)
      );
    });
  });

  afterEach(async () => {
    await revertSnapshot(snapshotId.result);
    snapshotId = await takeSnapshot();
  });
});
