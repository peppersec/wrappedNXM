<template>
  <div class="columns">
    <div class="column is-two-thirds-tablet is-half-desktop">
      <h1 class="title">
        wNXM Token
      </h1>
      <h2 class="subtitle">
        Wrap/Unwrap tokens to an address
      </h2>

      <div class="fields">
        <b-field
          label="Address"
          :type="{'is-danger': errors.has('address')}"
          :message="errors.first('address')"
          class="field-height"
        >
          <b-input
            v-model="address"
            v-validate="{ required: true, max: 42, valid_address: true }"
            name="address"
            placeholder="0x00000..."
            maxlength="42"
          />
        </b-field>

        <b-field
          label="Amount"
          :type="{'is-danger': errors.has('amount')}"
          :message="errors.first('amount')"
          class="field-height"
        >
          <b-input
            v-model="amount"
            v-validate="{ required: true, numeric: true }"
            type="number"
            name="amount"
            placeholder="1"
          />
        </b-field>

        <div class="level is-mobile">
          <button
            v-if="ethAccount"
            class="button is-primary"
            :disabled="clicked"
            @click.prevent="validateBeforeSubmit"
          >
            Wrap
          </button>
          <button
            v-if="ethAccount"
            class="button is-primary"
            :disabled="clicked"
            @click.prevent="sendApprove"
          >
            Approve
          </button>
          <button
            v-if="ethAccount"
            class="button is-primary"
            :disabled="clicked"
            @click.prevent="unwrap"
          >
            UnWrap
          </button>
          <button
            v-else
            class="button is-primary"
            @click.prevent="onConnectWeb3"
          >
            Connect
          </button>
          <a href="https://peppersec.com" target="_blank" class="is-flex">
            <span class="icon icon-madeby" />
          </a>
        </div>
      </div>

      <div v-if="ethAccount" class="info columns is-multiline">
        <div class="column">
          <p class="heading">
            NXM Balance
          </p>
          <p class="title">
            {{ NXMtokenBalance }} NXM
          </p>
        </div>
        <div class="column">
          <p class="heading">
            wNXM Balance
          </p>
          <p class="title">
            {{ tokenBalance }} wNXM
          </p>
        </div>
        <div class="column">
          <p class="heading">
            Can Wrap
          </p>
          <p class="title">
            {{ canWrap.status ? "Yes": canWrap.status !== null ? "No" : "" }}
            <span v-if="!canWrap.status && canWrap.status !== null" class="red">{{ canWrap.reason }}</span>
          </p>
        </div>
        <div class="column">
          <p class="heading">
            Can UnWrap
          </p>
          <p class="title">
            {{ canUnwrap.status ? "Yes": canUnwrap.status !== null ? "No" : "" }}
            <span v-if="!canUnwrap.status && canUnwrap.status !== null" class="red">{{ canUnwrap.reason }}</span>
          </p>
        </div>
        <div class="column is-12">
          <p class="heading">
            ETH Account
          </p>
          <p class="title">
            <a class="title" :href="addressUrl(ethAccount)" target="_blank">
              {{ ethAccount }}
            </a>
          </p>
        </div>
        <div class="column is-12">
          <p class="heading">
            Token Address
          </p>
          <p class="title">
            <a class="title" :href="addressUrl(tokenAddress)" target="_blank">
              {{ tokenAddress }}
            </a>
          </p>
        </div>
        <div v-show="txs.length > 0" class="column is-12">
          <p class="heading">
            Sent transactions
          </p>
          <b-field class="explorer" grouped group-multiline>
            <p
              v-for="(tx, index) in txs"
              :key="index"
              class="control"
            >
              <a :href="makeUrl(tx)" target="_blank">
                {{ makeUrl(tx) }}
              </a>
            </p>
          </b-field>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */
import Modal from '@/components/Modal'
import { mapState, mapGetters, mapActions } from 'vuex'

export default {
  data() {
    return {
      amount: '',
      clicked: false,
      canWrap: {
        status: null,
        reason: ''
      },
      canUnwrap: {
        status: null,
        reason: ''
      }
    }
  },
  computed: {
    ...mapState('metamask', ['balance', 'ethAccount']),
    ...mapState('token', ['txs']),
    ...mapGetters('metamask', ['networkName', 'currency']),
    address: {
      get() {
        return this.$store.state.metamask.address.value
      },
      set(address) {
        this.$store.dispatch('metamask/setAddress', { address })
      }
    },
    isAddressValid: {
      get() {
        return this.$store.state.metamask.address.valid
      }
    },
    tokenBalance: {
      get() {
        return this.$store.state.token.balance
      }
    },
    NXMtokenBalance: {
      get() {
        return this.$store.state.token.NXMbalance
      }
    },
    tokenAddress: {
      get() {
        return this.$store.state.token.address
      }
    }
  },
  watch: {
    async address(value) {
      // eslint-disable-next-line no-console
      this.$validator.validate('address', value)
      if (value) {
        const canWrap = await this.$store.dispatch('token/canWrap', { account: this.address, amount: this.amount })
        this.canWrap = {
          status: canWrap.isPassed,
          reason: canWrap.reason
        }
        const canUnwrap = await this.$store.dispatch('token/canUnwrap', { recipient: this.address, amount: this.amount })
        this.canUnwrap = {
          status: canUnwrap.isPassed,
          reason: canUnwrap.reason
        }
      }
    },
    async amount(value) {
      this.$validator.validate('amount', value)
      if (this.address) {
        const canWrap = await this.$store.dispatch('token/canWrap', { account: this.address, amount: this.amount })
        this.canWrap = {
          status: canWrap.isPassed,
          reason: canWrap.reason
        }

        const canUnwrap = await this.$store.dispatch('token/canUnwrap', { recipient: this.address, amount: this.amount })
        this.canUnwrap = {
          status: canUnwrap.isPassed,
          reason: canUnwrap.reason
        }
        console.log('canUnwrap', canUnwrap)
      }
    }
  },
  created() {
    this.$validator.extend('valid_address', {
      getMessage: field => `The ${field} must be valid.`,
      validate: () => {
        return !!this.isAddressValid
      }
    })
  },
  mounted() {
    window.onload = () => {
      this.$store.dispatch('metamask/fetchGasPrice', {})
    }
  },
  methods: {
    ...mapActions('token', ['wrapTokens', 'approve', 'unwrapTokens']),
    makeUrl(txHash) {
      const config = this.$store.getters['metamask/networkConfig']
      return `${config.explorerUrl.tx}/tx/${txHash}`
    },
    addressUrl(address) {
      const config = this.$store.getters['metamask/networkConfig']
      return `${config.explorerUrl.tx}/address/${address}`
    },
    onConnectWeb3() {
      this.$modal.open({
        parent: this,
        component: Modal,
        hasModalCard: true,
        width: 440
      })
    },
    validateBeforeSubmit() {
      this.clicked = true
      this.$validator.validateAll().then(async (result) => {
        if (result) {
          await this.wrapTokens({ amount: this.amount })
          this.$toast.open({
            message: 'Success',
            type: 'is-success',
            position: 'is-top'
          })
          this.clicked = false
          return
        }
        this.$toast.open({
          message: 'Please check the fields.',
          type: 'is-danger',
          position: 'is-top'
        })
        this.clicked = false
      })
      this.clicked = false
    },
    unwrap() {
      this.clicked = true
      this.$validator.validateAll().then(async (result) => {
        if (result) {
          await this.unwrapTokens({ to: this.address, amount: this.amount })
          this.$toast.open({
            message: 'Success',
            type: 'is-success',
            position: 'is-top'
          })
          this.clicked = false
          return
        }
        this.$toast.open({
          message: 'Please check the fields.',
          type: 'is-danger',
          position: 'is-top'
        })
        this.clicked = false
      })
    },
    sendApprove() {
      this.clicked = true
      this.$validator.validateAll().then(async (result) => {
        if (result) {
          await this.approve({ amount: this.amount })
          this.$toast.open({
            message: 'Success',
            type: 'is-success',
            position: 'is-top'
          })
          this.clicked = false
          return
        }
        this.$toast.open({
          message: 'Please check the fields.',
          type: 'is-danger',
          position: 'is-top'
        })
        this.clicked = false
      })
    }
  }
}
</script>
