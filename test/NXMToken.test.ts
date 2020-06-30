import { takeSnapshot, revertSnapshot } from '../lib/ganacheHelper';
import { NxmTokenInstance, WNxmInstance } from '../types/truffle-contracts';
const NXMToken = artifacts.require('NXMToken');
const wNXMToken = artifacts.require('wNXM');

import chai from 'chai';
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
chai.use(require('chai-as-promised'));
chai.should();

contract('wNXM', (accounts) => {
  let NXM: NxmTokenInstance;
  let wNXM: WNxmInstance;
  const operator = accounts[0];
  const member = accounts[1];
  const nonWhitelisted = accounts[2];
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
    it('should have DOMAIN_SEPARATOR', async () => {
      const DOMAIN_SEPARATOR = await wNXM.DOMAIN_SEPARATOR();
      console.log(DOMAIN_SEPARATOR);
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
    it('fails if not approved', async () => {
      const amountToWrap = memberAmount.div(new BN('2'));
      const canWrap = await wNXM.canWrap(member, amountToWrap);
      canWrap['0'].should.be.false; // success
      canWrap['1'].should.be.equal('insufficient allowance'); // reason
      await expectRevert.unspecified(wNXM.wrap(amountToWrap, { from: member }));
    });
    it('fails if insufficient balance', async () => {
      const amountToWrap = memberAmount.add(new BN('2'));
      await NXM.approve(wNXM.address, amountToWrap, { from: member });
      const canWrap = await wNXM.canWrap(member, amountToWrap);
      canWrap['0'].should.be.false; // success
      canWrap['1'].should.be.equal('insufficient NXM balance'); // reason
      await expectRevert.unspecified(wNXM.wrap(amountToWrap, { from: member }));
    });
    it('fails if is lockedForMv balance', async () => {
      await NXM.lockForMemberVote(member, 2, { from: operator });
      const amountToWrap = memberAmount.div(new BN('2'));
      await NXM.approve(wNXM.address, amountToWrap, { from: member });
      const canWrap = await wNXM.canWrap(member, amountToWrap);
      canWrap['0'].should.be.false; // success
      canWrap['1'].should.be.equal('NXM balance lockedForMv'); // reason
      await expectRevert.unspecified(wNXM.wrap(amountToWrap, { from: member }));
    });
    it('fails if wNXM is not whitelisted', async () => {
      let isWhitelisted = await NXM.whiteListed(wNXM.address);
      expect(isWhitelisted).to.equal(true);
      await NXM.removeFromWhiteList(wNXM.address, { from: operator });
      isWhitelisted = await NXM.whiteListed(wNXM.address);
      expect(isWhitelisted).to.equal(false);
      const amountToWrap = memberAmount.div(new BN('4'));
      await NXM.approve(wNXM.address, amountToWrap, { from: member });
      const canWrap = await wNXM.canWrap(member, amountToWrap);
      canWrap['0'].should.be.false; // success
      canWrap['1'].should.be.equal('wNXM is not whitelisted'); // reason
      await expectRevert.unspecified(wNXM.wrap(amountToWrap, { from: member }));
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
    it('succeeds if lockedForMv is true', async () => {
      const amountToWrap = memberAmount.div(new BN('2'));
      await NXM.approve(wNXM.address, amountToWrap, { from: member });
      await wNXM.wrap(amountToWrap, { from: member });

      await NXM.lockForMemberVote(member, 2, { from: operator });
      const canUnwrap = await wNXM.canUnwrap(member, member, amountToWrap);
      canUnwrap['0'].should.be.true; // success
      canUnwrap['1'].should.be.equal(''); // reason

      await wNXM.unwrap(amountToWrap, { from: member });
    });
    it('fails if lockedForMv of wNXM is true', async () => {
      const amountToWrap = memberAmount.div(new BN('2'));
      await NXM.approve(wNXM.address, amountToWrap, { from: member });
      await wNXM.wrap(amountToWrap, { from: member });

      await NXM.lockForMemberVote(wNXM.address, 2, { from: operator });
      const canUnwrap = await wNXM.canUnwrap(member, member, amountToWrap);
      canUnwrap['0'].should.be.false; // success
      canUnwrap['1'].should.be.equal('wNXM is lockedForMv'); // reason

      await expectRevert(wNXM.unwrap(amountToWrap, { from: member }), 'revert');
    });
    it('fails if insufficient balance', async () => {
      await NXM.approve(wNXM.address, memberAmount, { from: member });
      await wNXM.wrap(memberAmount, { from: member });

      const amountToUnWrap = memberAmount.add(new BN('1'));
      const canUnwrap = await wNXM.canUnwrap(member, member, amountToUnWrap);
      canUnwrap['0'].should.be.false; // success
      canUnwrap['1'].should.be.equal('insufficient wNXM balance'); // reason

      await expectRevert(wNXM.unwrap(amountToUnWrap, { from: member }), 'ERC20: burn amount exceeds balance');
    });
    it('fails if not whitelisted', async () => {

      await NXM.approve(wNXM.address, memberAmount, { from: member });
      await wNXM.wrap(memberAmount, { from: member });
      await wNXM.transfer(nonWhitelisted, memberAmount, { from: member });
      const canUnwrap = await wNXM.canUnwrap(nonWhitelisted, nonWhitelisted, memberAmount);
      canUnwrap['0'].should.be.false; // success
      canUnwrap['1'].should.be.equal('recipient is not whitelisted'); // reason

      await expectRevert(wNXM.unwrap(memberAmount, { from: nonWhitelisted }), 'revert');
    });

  });

  describe('#unwrapTo', () => {
    it('should work', async () => {
      const recipient = accounts[4];
      await NXM.addToWhiteList(recipient);
      const amountToWrap = memberAmount.div(new BN('2'));

      await NXM.approve(wNXM.address, amountToWrap, { from: member });
      await wNXM.wrap(amountToWrap, { from: member });

      const wNXMBalanceBefore = await wNXM.balanceOf(member);
      const NXMBalanceBefore = await NXM.balanceOf(recipient);

      const canUnwrap = await wNXM.canUnwrap(member, recipient, amountToWrap);
      canUnwrap['0'].should.be.true; // success
      canUnwrap['1'].should.be.equal(''); // reason

      await wNXM.unwrapTo(amountToWrap, recipient, { from: member });

      const wNXMBalanceAfter = await wNXM.balanceOf(member);
      const NXMBalanceAfter = await NXM.balanceOf(recipient);

      expect(wNXMBalanceAfter).to.be.a.bignumber.that.equals(
        BN(wNXMBalanceBefore).sub(amountToWrap)
      );

      expect(NXMBalanceAfter).to.be.a.bignumber.that.equals(
        BN(NXMBalanceBefore).add(amountToWrap)
      );
    });
  });

  describe('#permit', () => {
    it('calls approve if signature is valid');
    it('reverts if signature is corrupted');
    it('reverts if signature is expired');
  });

  describe('#claimTokens', () => {
    it('withdraws arbitrary erc20');
    it('reverts if NXM token is specified');
    it('reverts if wNXM token is specified');
  });

  describe('#transferAndCall', () => {
    it('should work');
  });

  afterEach(async () => {
    await revertSnapshot(snapshotId.result);
    snapshotId = await takeSnapshot();
  });
});
