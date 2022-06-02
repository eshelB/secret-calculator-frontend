import React, { Component } from "react";
import {SecretNetworkClient, MsgExecuteContract, fromUtf8} from "secretjs";

import "./App.css";
import {getHistory} from "./getHistory";
import Input from "./components/Input";
import History from "./components/History";
import MathButton from "./components/MathButton";

class App extends Component {
  state = {
    firstOperand: 0,
    secondOperand: 0,
    status: "Wallet not yet approved",
    calcs: [],
    total: 0,
    secretjs: null,
    myAddress: null,
    pageSize: 10,
    page: 0,
    historyLoading: true,
    permit: null,
    signature: null,
    historyError: false,
  };

  componentDidMount = async () => {
    console.log("using chain id:", process.env.REACT_APP_CHAIN_ID);
    try {
      console.log("attempting to connect to scrt-network via ", process.env.REACT_APP_GRPC_WEB_URL);

      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      while (
        !window.getEnigmaUtils ||
        !window.getOfflineSignerOnlyAmino
      ) {
        await sleep(100);
      }

      await window.keplr.experimentalSuggestChain({
        chainId: process.env.REACT_APP_CHAIN_ID,
        chainName: process.env.REACT_APP_CHAIN_ID,
        rpc: process.env.REACT_APP_RPC_KEPLR,
        rest: process.env.REACT_APP_LCD_KEPLR,
        bip44: {
          coinType: 529,
        },
        coinType: 529,
        stakeCurrency: {
          coinDenom: "SCRT",
          coinMinimalDenom: "uscrt",
          coinDecimals: 6,
        },
        bech32Config: {
          bech32PrefixAccAddr: "secret",
          bech32PrefixAccPub: "secretpub",
          bech32PrefixValAddr: "secretvaloper",
          bech32PrefixValPub: "secretvaloperpub",
          bech32PrefixConsAddr: "secretvalcons",
          bech32PrefixConsPub: "secretvalconspub",
        },
        currencies: [
          {
            coinDenom: "SCRT",
            coinMinimalDenom: "uscrt",
            coinDecimals: 6,
          },
        ],
        feeCurrencies: [
          {
            coinDenom: "SCRT",
            coinMinimalDenom: "uscrt",
            coinDecimals: 6,
          },
        ],
        gasPriceStep: {
          low: 0.1,
          average: 0.25,
          high: 0.4,
        },
        features: ["secretwasm", "stargate", "ibc-go", "ibc-transfer"],
      });

      let keplrOfflineSigner;
      try {
        await window.keplr.enable(process.env.REACT_APP_CHAIN_ID);
        keplrOfflineSigner = window.getOfflineSignerOnlyAmino(process.env.REACT_APP_CHAIN_ID);
      } catch (e) {
        console.log("keplr is not configured to work with ", process.env.REACT_APP_CHAIN_ID);
      }
      const [{ address: myAddress }] = await keplrOfflineSigner.getAccounts();
      console.log("my address is:", myAddress);

      const secretjs = await SecretNetworkClient.create({
        grpcWebUrl: process.env.REACT_APP_GRPC_WEB_URL,
        chainId: process.env.REACT_APP_CHAIN_ID,
        // wallet,
        wallet: keplrOfflineSigner,
        walletAddress: myAddress,
        encryptionUtils: window.getEnigmaUtils(process.env.REACT_APP_CHAIN_ID),
      });
      console.log("created secret client");

      document.title = "Secret Calculator";

      this.setState({ status: "No transactions pending", secretjs, myAddress });
    } catch (error) {
      alert(`Failed to connect to secret network. Check console for details.`);
      console.error(error);
    }

    this.reloadHistory();
    console.log("state:", this.state);
  };

  reloadHistory = async (additionalStateUpdates) => {
    const state = {historyLoading: true, ...additionalStateUpdates};
    console.log("setting state before reloading history: ", JSON.stringify(state, null, 2))
    await this.setState({
      historyLoading: true,
      historyError: false,
      ...additionalStateUpdates,
    });
    try {
      const [history, signature] = await getHistory({
        secretjs: this.state.secretjs,
        page: this.state.page,
        pageSize: this.state.pageSize,
        signerAddress: this.state.myAddress,
        cachedSignature: this.state.signature,
      });

      console.log("calculation history received:", history, "sig:", signature);
      this.setState({
        calcs: history.calculation_history.calcs,
        total: parseInt(history.calculation_history.total),
        historyLoading: false,
        signature,
      });
    } catch (e) {
      console.error("error when while updating history:", e);
      this.setState({
        historyLoading: false,
        historyError: true,
      });
    }
  };

  getOperation = (functionName) => {
    const result = async () => {
      let { firstOperand, secondOperand } = this.state;
      [ firstOperand, secondOperand ] = [ firstOperand.toString(), secondOperand.toString() ];
      console.log(`calling ${functionName} function with operands:`, firstOperand, secondOperand);

      let tx;
      let status;
      try {
        console.log(`sending ${functionName} tx from`, this.state.myAddress);
        this.setState({status: "Sending transaction..."});

        const msg = { [functionName]: functionName === "sqrt" ? firstOperand : [firstOperand, secondOperand] };

        const calculationMessage = new MsgExecuteContract({
          sender: this.state.myAddress,
          contract: process.env.REACT_APP_CONTRACT_ADDRESS,
          codeHash: process.env.REACT_APP_CONTRACT_HASH,
          msg,
        });

        console.log(`broadcasting tx with msg: ${JSON.stringify(msg, null, 2)}`);
        tx = await this.state.secretjs.tx.broadcast([calculationMessage], {
          gasLimit: 200000,
        });

        console.log("tx successfully included in block");
        console.log(`the tx of the ${functionName} function is:`, tx);

        const txHashEnd = tx.transactionHash.slice(tx.transactionHash.length - 5);

        if (tx.jsonLog?.generic_err || tx.jsonLog?.parse_err) {
          status = `Transaction ${txHashEnd} errored`;
          this.setState({status});
          alert(`Transaction ${txHashEnd} failed: ${tx.jsonLog.generic_err?.msg || tx.jsonLog.parse_err?.msg}`);
          return;
        } else {
          const resultString = fromUtf8(tx.data[0]);
          console.log("result in tx data:", resultString);
          const resultNumber = resultString.slice(1, -1);
          status = `Transaction ${txHashEnd} was included in block. result: ${parseInt(resultNumber)}`;
          console.log(status);
        }
      } catch (e) {
        console.log(e);
        alert(`there was an error calling the ${functionName} method: ${e.toString()}`);
      }

      this.reloadHistory({status});
    }

    console.log(`returned ${functionName} function`);
    return result;
  };

  // can't use directly "this.getOperation" in the DOM, since then it will request the function every time
  // the state changes
  functions = {
    add: this.getOperation("add"),
    sub: this.getOperation("sub"),
    mul: this.getOperation("mul"),
    div: this.getOperation("div"),
    sqrt: this.getOperation("sqrt"),
  };

  getStateSetterForName = (stateVariableName) => {
    const result = async (event) => {
      this.setState({[stateVariableName]: event.target.value});
      console.log(`set ${stateVariableName} to ${event.target.value}`);
    }
    console.log(`returned setter for ${stateVariableName} state variable`);
    return result;
  };

  // Similarly, can't use directly "this.getStateSetterForName" in the DOM, for the same reason
  setters = {
    setter1: this.getStateSetterForName("firstOperand"),
    setter2: this.getStateSetterForName("secondOperand"),
  };

  render() {
    if (!window.keplr) {
      return <div>Keplr extension is not installed =(</div>;
    }

    if (!this.state.secretjs) {
      return <div>Loading SecretJs, Keplr, and contract...</div>;
    }

    return (
      <div className="App">
        <h1>Secret Calculator</h1>
        <p>
          Welcome to Secret Calculator, where your calculations are stored on the blockchain but only you can see them!
        </p>
        <Input label="1" onchange={this.setters.setter1} value={this.state.firstOperand}/>
        <Input label="2" onchange={this.setters.setter2} value={this.state.secondOperand}/>
        <div className="flexbox-container">
          <MathButton label="+" onclick={this.functions.add}/>
          <MathButton label="–" onclick={this.functions.sub}/>
          <MathButton label="×" onclick={this.functions.mul}/>
          <MathButton label="÷" onclick={this.functions.div}/>
          <MathButton label="√(operand 1)" onclick={this.functions.sqrt}/>
        </div>
        <h2>
          {this.state.status}
        </h2>
        <History
          secretjs={this.state.secretjs}
          calcs={this.state.calcs}
          total={this.state.total}
          page_size={this.state.pageSize}
          page={this.state.page}
          history_loading={this.state.historyLoading}
          history_error={this.state.historyError}
        />
        <div className="flexbox-container">
          <button className="Pagination"
                  onClick={() => this.reloadHistory({page: 0})}
                  disabled={this.state.page === 0 || this.state.historyLoading}
          >
            Page 0
          </button>
          <button className="Pagination"
                  onClick={() => this.reloadHistory({page: this.state.page + 1})}
                  disabled={this.state.historyLoading || ((this.state.page + 1) * this.state.pageSize) >= this.state.total}
          >
            Next page {">"}
          </button>
        </div>
      </div>
    );
  }
}

export default App;
