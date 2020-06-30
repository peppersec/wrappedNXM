import { EIP712Signer, EIP712Payload, EIP712Domain, EIP712Signature } from '@ticket721/e712';
import BN from 'bn.js';

const Permit = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' }
];

export type PermitArgs = {
  owner: string;
  spender: string;
  value: BN | string;
  nonce: Number;
  deadline: BN | string;
}


export class PermitSigner extends EIP712Signer {

    private permitArgs: PermitArgs;

    constructor(_domain: EIP712Domain, _permitArgs: PermitArgs) {
        super(
            _domain,
            ['Permit', Permit]
        );
        this.permitArgs = _permitArgs;
    }

    // Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)
    setPermitInfo(_permitArgs: PermitArgs): void {
      this.permitArgs = _permitArgs;
    }

    getPayload(): EIP712Payload {
        return this.generatePayload(this.permitArgs, 'Permit');
    }

    /**
    * Generate a signature from the values previously given by the user
    *
    * @param privateKey
    */
    async getSignature(privateKey: string): Promise<EIP712Signature> {
        const payload = this.getPayload();
        const { hex, v, r, s } = await this.sign(privateKey, payload)
        return {
          hex,
          v,
          r: '0x' + r,
          s: '0x' + s,
        }
    }

    /**
    * Verifies a given signature and retrieves the signer address
    *
    * @param firstName
    * @param lastName
    * @param age
    * @param signature
    */
    async getSignerAddress(permitArgs: PermitArgs, signature: string): Promise<string> {
        const original_payload = this.generatePayload(permitArgs, 'Permit');
        return this.verify(original_payload, signature);
    }
}
