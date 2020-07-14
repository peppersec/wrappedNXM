/* eslint-disable no-unused-vars */
/* eslint-disable no-console */
import { fromWei, toHex, toWei, numberToHex, hexToNumberString } from 'web3-utils'
import ABI from '@/abis/ERC20.abi.json'
import networkConfig from '@/networkConfig'

const state = () => {
  return {
    address: null,
    balance: '0',
    txs: [],
    NXMbalance: '0'
  }
}

const getters = {
  tokenInstance: (state, getters, rootState, rootGetters) => async () => {
    const { ethAccount, netId } = rootState.metamask
    const { verifyingContract } = networkConfig[`netId${netId}`]
    console.log('netId', netId, verifyingContract)
    const web3 = await rootGetters['metamask/web3']()
    return new web3.eth.Contract(ABI, verifyingContract, {
      from: ethAccount
    })
  },
  NXMtokenInstance: (state, getters, rootState, rootGetters) => async () => {
    const { ethAccount, netId } = rootState.metamask
    const { NXM } = networkConfig[`netId${netId}`]
    const web3 = await rootGetters['metamask/web3']()
    return new web3.eth.Contract(ABI, NXM, {
      from: ethAccount
    })
  }
}

const mutations = {
  SET_TOKEN_ADDRESS(state, address) {
    state.address = address
  },
  SET_TOKEN_BALANCE(state, balance) {
    state.balance = fromWei(balance)
  },
  SET_NXM_BALANCE(state, balance) {
    state.NXMbalance = fromWei(balance)
  },
  ADD_TX(state, txHash) {
    state.txs.push(txHash)
  }
}

const actions = {
  async getTokenBalance({ state, getters, rootState, dispatch, commit }) {
    const { ethAccount } = rootState.metamask
    const tokenInstance = await getters.tokenInstance()
    const data = tokenInstance.methods.balanceOf(ethAccount).encodeABI()
    const callParams = {
      method: 'eth_call',
      params: [{
        from: ethAccount,
        to: tokenInstance._address,
        data
      }, 'latest'],
      from: ethAccount
    }
    let balance = await dispatch('metamask/sendAsync', callParams, { root: true })
    balance = hexToNumberString(balance)
    commit('SET_TOKEN_BALANCE', balance)

    const NXMtokenInstance = await getters.NXMtokenInstance()
    callParams.params[0].to = NXMtokenInstance._address
    let NXMbalance = await dispatch('metamask/sendAsync', callParams, { root: true })
    NXMbalance = hexToNumberString(NXMbalance)
    commit('SET_NXM_BALANCE', NXMbalance)
    setTimeout(() => { dispatch('getTokenBalance') }, 3000)
  },
  async canWrap({ state, getters, rootGetters, rootState, dispatch, commit }, { account, amount }) {
    const tokenInstance = await getters.tokenInstance()
    const { ethAccount } = rootState.metamask
    const data = tokenInstance.methods.canWrap(account, toWei(amount)).encodeABI()
    const callParams = {
      method: 'eth_call',
      params: [{
        from: ethAccount,
        to: tokenInstance._address,
        data
      }, 'latest'],
      from: ethAccount
    }
    const canWrap = await dispatch('metamask/sendAsync', callParams, { root: true })
    const web3 = await rootGetters['metamask/web3']()
    const result = web3.eth.abi.decodeParameters(['bool', 'string'], canWrap)
    return { reason: result[1], isPassed: result[0] }
  },
  async canUnwrap({ state, getters, rootState, rootGetters, dispatch, commit }, { recipient, amount }) {
    console.log('rec', recipient, amount)
    const { ethAccount } = rootState.metamask
    const tokenInstance = await getters.tokenInstance()
    const data = tokenInstance.methods.canUnwrap(ethAccount, recipient, toWei(amount)).encodeABI()
    const callParams = {
      method: 'eth_call',
      params: [{
        from: ethAccount,
        to: tokenInstance._address,
        data
      }, 'latest'],
      from: ethAccount
    }
    const canunwrap = await dispatch('metamask/sendAsync', callParams, { root: true })
    const web3 = await rootGetters['metamask/web3']()
    const result = web3.eth.abi.decodeParameters(['bool', 'string'], canunwrap)
    return { reason: result[1], isPassed: result[0] }
  },

  async getTokenAddress({ state, getters, commit }) {
    const tokenInstance = await getters.tokenInstance()
    commit('SET_TOKEN_ADDRESS', tokenInstance._address)
  },

  async wrapTokens({ state, getters, rootState, rootGetters, dispatch, commit }, { amount }) {
    amount = amount.toString()
    const gasPrice = rootState.metamask.gasPrice.standard
    const tokenInstance = await getters.tokenInstance()
    const { ethAccount } = rootState.metamask
    const data = tokenInstance.methods.wrap(toWei(amount)).encodeABI()
    const gas = await tokenInstance.methods.wrap(toWei(amount)).estimateGas()
    const callParams = {
      method: 'eth_sendTransaction',
      params: [{
        from: ethAccount,
        to: tokenInstance._address,
        gas: numberToHex(gas + 100000),
        gasPrice: toHex(toWei(gasPrice.toString(), 'gwei')),
        value: 0,
        data
      }],
      from: ethAccount
    }
    const txHash = await dispatch('metamask/sendAsync', callParams, { root: true })
    commit('ADD_TX', txHash)
  },

  async unwrapTokens({ state, getters, rootState, rootGetters, dispatch, commit }, { to, amount }) {
    amount = amount.toString()
    const gasPrice = rootState.metamask.gasPrice.standard
    const tokenInstance = await getters.tokenInstance()
    const { ethAccount } = rootState.metamask
    const data = tokenInstance.methods.unwrapTo(to, toWei(amount)).encodeABI()
    const gas = await tokenInstance.methods.unwrapTo(to, toWei(amount)).estimateGas()
    const callParams = {
      method: 'eth_sendTransaction',
      params: [{
        from: ethAccount,
        to: tokenInstance._address,
        gas: numberToHex(gas + 100000),
        gasPrice: toHex(toWei(gasPrice.toString(), 'gwei')),
        value: 0,
        data
      }],
      from: ethAccount
    }
    const txHash = await dispatch('metamask/sendAsync', callParams, { root: true })
    commit('ADD_TX', txHash)
  },

  async approve({ state, getters, rootState, rootGetters, dispatch, commit }, { amount }) {
    amount = amount.toString()
    const gasPrice = rootState.metamask.gasPrice.standard
    const tokenInstance = await getters.tokenInstance()
    const NXMtokenInstance = await getters.NXMtokenInstance()
    const { ethAccount } = rootState.metamask
    const data = NXMtokenInstance.methods.approve(tokenInstance._address, toWei(amount)).encodeABI()
    const gas = await NXMtokenInstance.methods.approve(tokenInstance._address, toWei(amount)).estimateGas()
    const callParams = {
      method: 'eth_sendTransaction',
      params: [{
        from: ethAccount,
        to: NXMtokenInstance._address,
        gas: numberToHex(gas + 100000),
        gasPrice: toHex(toWei(gasPrice.toString(), 'gwei')),
        value: 0,
        data
      }],
      from: ethAccount
    }
    const txHash = await dispatch('metamask/sendAsync', callParams, { root: true })
    commit('ADD_TX', txHash)
  }

}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
