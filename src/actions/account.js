import { parse, stringify } from 'query-string'
import { createActions } from 'redux-actions'
import { Wallet } from '../utils/wallet'

export const REFRESH_ACCOUNT = 'REFRESH_ACCOUNT'
export const LOADER_ACCOUNT = 'LOADER_ACCOUNT'
export const REFRESH_URL = 'REFRESH_URL'

export function handleRefreshAccount(history, loader = true) {
   return (dispatch, getState) => {
      if (loader) {
         dispatch({
            type: LOADER_ACCOUNT,
            loader: true
         })   
      }

      if (wallet.isEmpty()) {
         if (loader) {
            dispatch({
               type: LOADER_ACCOUNT,
               loader: false
            })   
         }

         return false
      }
      
      const accountId = wallet.getAccountId()

      wallet
         .loadAccount(accountId, history)
         .then(v => {
            dispatch({
               type: REFRESH_ACCOUNT,
               data: {
                  accountId: accountId,
                  amount: v['amount'] || 0,
                  stake: v['stake'],
                  nonce: v['nonce'],
                  code_hash: v['code_hash'],
                  accounts: wallet.accounts
               }
            })
         })
         .catch(e => {
            console.error('Error loading account:', e)

            if (e.message && e.message.indexOf('does not exist while viewing') !== -1) {
               // We have an account in the storage, but it doesn't exist on blockchain. We probably nuked storage so just redirect to create account
               // TODO: Offer to remove specific account vs clearing everything?
               wallet.clearState()               
               wallet.redirectToCreateAccount(
                  {
                     reset_accounts: true
                  },
                  history
               )
            }
         })
         .finally(() => {
            if (loader) {
               dispatch({
                  type: LOADER_ACCOUNT,
                  loader: false
               })
            }
         })
   }
}

export function handleRefreshUrl(location) {
   return dispatch => {
      const { title, app_url, contract_id, success_url, failure_url, public_key, transaction, callback, account_id, send } = parse(location.search)

      dispatch({
         type: REFRESH_URL,
         url: {
            title: title || '',
            app_url: app_url || '',
            contract_id: contract_id || '',
            success_url: success_url || '',
            failure_url: failure_url || '',
            public_key: public_key || '',
            transaction: transaction || '',
            callback: callback || ``,
            account_id: account_id || '',
            send: send || '',
         }
      })
   }
}

const wallet = new Wallet()

export const redirectToApp = () => (dispatch, getState) => {
   const state = getState()
   const nextUrl = (state.account.url && (state.account.url.success_url || state.account.url.public_key)) ? `/login/?${stringify(state.account.url)}` : '/'
   
   setTimeout(() => {
      window.location = nextUrl
   }, 1500)
}

const defaultCodesFor = (prefix) => () => ({ successCode: `${prefix}.success`, errorCode: `${prefix}.error` })

export const { requestCode, setupAccountRecovery, recoverAccount, checkNewAccount, createNewAccount, checkAccountAvailable, clear, clearCode } = createActions({
   REQUEST_CODE: [
      wallet.requestCode.bind(wallet),
      defaultCodesFor('account.requestCode')
   ],
   SETUP_ACCOUNT_RECOVERY: [
      wallet.setupAccountRecovery.bind(wallet),
      defaultCodesFor('account.setupAccountRecovery')
   ],
   RECOVER_ACCOUNT: [
      wallet.recoverAccount.bind(wallet),
      defaultCodesFor('account.recoverAccount')
   ],
   CHECK_NEW_ACCOUNT: [
      wallet.checkNewAccount.bind(wallet),
      defaultCodesFor('account.create')
   ],
   CREATE_NEW_ACCOUNT: [
      wallet.createNewAccount.bind(wallet),
      defaultCodesFor('account.create')
   ],
   CHECK_ACCOUNT_AVAILABLE: [
      wallet.checkAccountAvailable.bind(wallet),
      defaultCodesFor('account.available')
   ],
   CLEAR: null,
   CLEAR_CODE: null
})

export const { getAccessKeys, removeAccessKey, addLedgerAccessKey } = createActions({
   GET_ACCESS_KEYS: [wallet.getAccessKeys.bind(wallet), () => ({})],
   REMOVE_ACCESS_KEY: [wallet.removeAccessKey.bind(wallet), () => ({})],
   ADD_LEDGER_ACCESS_KEY: [wallet.addLedgerAccessKey.bind(wallet), () => ({})],
})

export const { addAccessKey, clearAlert } = createActions({
   ADD_ACCESS_KEY: [
      wallet.addAccessKey.bind(wallet),
      (accountId, contractId, publicKey, successUrl, title) => ({
         successCodeHeader: 'Success',
         successCodeDescription: title + ' is now authorized to use your account.',
         errorCodeHeader: 'Error',
         errorCodeDescription: '' 
      })
   ],
   CLEAR_ALERT: null,
})

export const { switchAccount } = createActions({
   SWITCH_ACCOUNT: wallet.selectAccount.bind(wallet)
})
