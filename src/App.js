import React, { useState, useCallback } from "react";
import { Buffer } from "buffer";
import "./App.css";

function App() {
  const [ethereum, setEthereum] = useState(window.ethereum);
  const [address, setAddress] = useState(ethereum.selectedAddress);
  const [account, setAccount] = useState(null);
  const [token, setToken] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState(null);

  const get_nonce = useCallback(async () => {
    const reqOpts = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };
    const response = await fetch(
      "http://localhost:8002/users/" + address + "/nonce",
      reqOpts
    );
    if (response.status === 200) {
      const data = await response.json();
      const nonce = data.Nonce;
      return [200, nonce];
    }
    return [response.status, ""];
  }, [address]);

  const register = useCallback(async () => {
    const reqOpts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: address,
      }),
    };
    const response = await fetch("http://localhost:8002/register", reqOpts);
    if (response.status === 201) {
      return true;
    }
    return false;
  }, [address]);

  const sign = useCallback(
    async (nonce) => {
      const buff = Buffer.from(nonce, "utf-8");
      const signature = await ethereum.request({
        method: "personal_sign",
        params: [buff.toString("hex"), account],
      });
      return signature;
    },
    [account, ethereum]
  );

  const perform_signin = useCallback(
    async (sig, nonce) => {
      const reqOpts = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address,
          nonce: nonce,
          sig: sig,
        }),
      };
      const response = await fetch("http://localhost:8002/signin", reqOpts);
      if (response.status === 200) {
        const data = await response.json();
        return data;
      }
      return null;
    },
    [address]
  );

  const login = useCallback(async () => {
    if (address === null || account === null) {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      setAddress(ethereum.selectedAddress);
    }
    const [status_code, nonce] = await get_nonce();
    if (status_code === 404) {
      const registered = await register();
      if (!registered) {
        return;
      }
      await login();
      return;
    } else if (status_code !== 200) {
      return;
    }
    const signature = await sign(nonce);
    const data = await perform_signin(signature, nonce);
    setToken(data.access);
    setLoggedIn(true);
  }, [account, address, ethereum, get_nonce, perform_signin, register, sign]);

  const get_welcome = useCallback(async () => {
    const reqOpts = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    };

    console.log(reqOpts);
    const response = await fetch("http://localhost:8002/welcome", reqOpts);
    if (response.status === 200) {
      const welcome = await response.json();
      setWelcomeMsg(welcome.msg);
    } else {
      console.log(response.status);
    }
  }, [token]);

  return (
    <div className="App">
      <button type="button" onClick={login}>
        Metamask
      </button>
      <br />
      {loggedIn && (
        <button type="button" onClick={get_welcome}>
          Welcome
        </button>
      )}
      {welcomeMsg && <p>{welcomeMsg}</p>}
    </div>
  );
}

export default App;
