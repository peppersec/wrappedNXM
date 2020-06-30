import { takeSnapshot, revertSnapshot } from '../lib/ganacheHelper';
import { NxmTokenInstance, WNxmMockInstance } from '../types/truffle-contracts';
import { PermitSigner, PermitArgs } from '../lib/Permit';
import { EIP712Domain } from '@ticket721/e712';
const NXMToken = artifacts.require('NXMToken');
const wNXMMock = artifacts.require('wNXMMock');

import chai from 'chai';
const { expect } = require('chai');
const { expectRevert } = require('@openzeppelin/test-helpers');
const BN = require('bn.js');
chai.use(require('chai-bn')(BN));
chai.use(require('chai-as-promised'));
chai.should();

contract('wNXM', (accounts) => {
  let NXM: NxmTokenInstance;
  let wNXM: WNxmMockInstance;
  const operator = accounts[0];
  const operatorPrivateKey = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
  const member = accounts[1];
  const memberPrivateKey = '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1';
  const nonWhitelisted = accounts[2];
  let snapshotId: { result: string };
  const memberAmount = new BN(web3.utils.toWei('100', 'ether'));
  let domain: EIP712Domain;
  let chainId;

  before(async () => {
    chainId = await web3.eth.net.getId();
    NXM = await NXMToken.deployed();
    wNXM = await wNXMMock.new(NXM.address);
    await NXM.transfer(member, memberAmount, { from: operator });
    await NXM.addToWhiteList(wNXM.address);
    await wNXM.setChainId(chainId);
    snapshotId = await takeSnapshot();
    domain = {
      name: await wNXM.name(),
      version: '1',
      chainId,
      verifyingContract: wNXM.address
    };
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

    it('fails if not approved', async () => {
      const amountToWrap = memberAmount.div(new BN('2'));
      const canWrap = await wNXM.canWrap(member, amountToWrap);
      canWrap['0'].should.be.false; // success
      canWrap['1'].should.be.equal('insufficient allowance'); // reason
      await expectRevert(wNXM.wrap(amountToWrap, { from: member }), 'Error: Revert or exceptional halt');
    });

    it('fails if insufficient balance', async () => {
      const amountToWrap = memberAmount.add(new BN('2'));
      await NXM.approve(wNXM.address, amountToWrap, { from: member });
      const canWrap = await wNXM.canWrap(member, amountToWrap);
      canWrap['0'].should.be.false; // success
      canWrap['1'].should.be.equal('insufficient NXM balance'); // reason
      await expectRevert(wNXM.wrap(amountToWrap, { from: member }), 'Error: Revert or exceptional halt');
    });

    it('fails if is lockedForMv balance', async () => {
      await NXM.lockForMemberVote(member, 2, { from: operator });
      const amountToWrap = memberAmount.div(new BN('2'));
      await NXM.approve(wNXM.address, amountToWrap, { from: member });
      const canWrap = await wNXM.canWrap(member, amountToWrap);
      canWrap['0'].should.be.false; // success
      canWrap['1'].should.be.equal('NXM balance lockedForMv'); // reason
      await expectRevert(wNXM.wrap(amountToWrap, { from: member }), 'Error: Revert or exceptional halt');
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
      await expectRevert(wNXM.wrap(amountToWrap, { from: member }), 'Error: Revert or exceptional halt');
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

      await expectRevert(wNXM.unwrap(amountToWrap, { from: member }), 'Error: Revert or exceptional halt');
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

      await expectRevert(wNXM.unwrap(memberAmount, { from: nonWhitelisted }), 'Error: Revert or exceptional halt');
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
    it('permitSigner class should work', async () => {
      const args: PermitArgs = {
        owner: operator,
        spender: member,
        value: memberAmount,
        nonce: 0,
        deadline: new BN('123123123123123')
      };

      const permitSigner = new PermitSigner(domain, args);
      const message = permitSigner.getPayload();
      // console.log('message', JSON.stringify(message));

      // Generate the signature in place
      const privateKey = '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c';
      const address = '0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b';
      const signature = await permitSigner.getSignature(privateKey);
      const signer = await permitSigner.getSignerAddress(args, signature.hex);
      address.should.be.equal(signer);
    });

    it('calls approve if signature is valid', async () => {
      const chainIdFromContract = await wNXM.chainId();
      expect(chainIdFromContract).to.be.a.bignumber.that.equals(
        new BN(domain.chainId)
      );
      const args: PermitArgs = {
        owner: operator,
        spender: member,
        value: memberAmount,
        nonce: 0,
        deadline: new BN('1594525063') // 07/12/2020 @ 3:37am (UTC)
      };
      const permitSigner = new PermitSigner(domain, args);
      const signature = await permitSigner.getSignature(operatorPrivateKey);
      const signer = await permitSigner.getSignerAddress(args, signature.hex);
      signer.should.be.equal(operator);

      const allowanceBefore = await wNXM.allowance(operator, member);
      await wNXM.permit(
        args.owner,
        args.spender,
        args.value.toString(),
        args.deadline.toString(),
        signature.v,
        signature.r,
        signature.s,
        { from: operator }
      );
      const allowanceAfter = await wNXM.allowance(operator, member);
      console.log('allowanceAfter', allowanceAfter.toString());

      expect(allowanceAfter).to.be.a.bignumber.that.equals(
        BN(allowanceBefore).add(args.value)
      );
    });
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
