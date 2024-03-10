import React, { useState, useEffect } from 'react';
import { Input, Popover, Radio, Modal, message } from "antd";
import axios from "axios";
import { useSendTransaction, useWaitForTransaction } from 'wagmi';
import tokenList from "../util/tokenList.json";
import {
  ArrowDownOutlined,
  DownOutlined,
  SettingOutlined
} from "@ant-design/icons";

const Swap = (props) => {
  const { address, isConnected } = props;
  const [messageApi, contextHolder] = message.useMessage();
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOneAmount, setTokenOneAmount] = useState(null);
  const [tokenTwoAmount, setTokenTwoAmount] = useState(null);
  const [tokenOne, setTokenOne] = useState(tokenList[0]);
  const [tokenTwo, setTokenTwo] = useState(tokenList[1]);
  const [isOpen, setIsOpen] = useState(false);
  const [changeToken, setChangeToken] = useState(false);
  const [prices, setPrices] = useState(null);
  const [txDetails, setTxDetails] = useState({
    to: null,
    data: null,
    value: null
  });
  const { data, sendTransaction } = useSendTransaction({
    request: {
      from: address,
      to: String(txDetails.to),
      data: String(txDetails.data),
      value: String(txDetails.value)
    }
  });

  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash
  });

  useEffect(() => {
    fetchPrices(tokenList[0].address, tokenList[1].address);
  }, []);

  useEffect(() => {
    if (txDetails.to && isConnected) {
      sendTransaction();
    }
  }, [txDetails]);

  useEffect(() => {
    messageApi.destroy();

    if (isLoading) {
      messageApi.open({
        type: "loading",
        content: "Transaction is Pending...",
        duration: 0
      });
    }
  }, [isLoading]);

  useEffect(() => {
    messageApi.destroy();

    if (isSuccess) {
      messageApi.open({
        type: "success",
        content: "Transaction successful!",
        duration: 1.5
      });
    } else if (txDetails.to) {
      messageApi.open({
        type: "error",
        content: "Transaction failed!",
        duration: 1.50
      });
    }
  }, [isSuccess]);
  const fetchPrices = async (one, two) => {
    const res = await axios.get(`http://localhost:3001/tokenPrice`, {
      params: { addressOne: one, addressTwo: two }
    });

    setPrices(res.data);
  }

  const fetchDexSwap = async () => {
    const allowance = await axios.get(`https://api.1inch.io/v5.0/1/approve/allowance?tokenAddress=${tokenOne.address}&walletAddress=${address}`);

    if (allowance.data.allowance === "0") {
      const approve = await axios.get(`https://api.1inch.io/v5.0/1/approve/transaction?tokenAddress=${tokenOne.address}`);
      setTxDetails(approve.data);
      console.log("not approved");
    }

    const tx = await axios.get(`https://api.1inch.io/v5.0/1/swap?fromTokenAddress=${tokenOne.address}&toTokenAddress=${tokenTwo.address}&amount=${tokenOneAmount.padEnd(tokenOne.decimals + tokenOneAmount.length, '0')}&fromAddress=${address}&slippage=${slippage}`);

    let decimals = Number(`1E${tokenTwo.decimals}`);

    setTokenTwoAmount((Number(tx.data.toTokenAmount) / decimals).toFixed(2));

    setTxDetails(tx.data.tx);
  }
  const handleSlippageChange = (e) => {
    setSlippage(e.target.value);
  }

  const changeAmount = (e) => {
    const value = e.target.value;
    setTokenOneAmount(value);
    if (value && prices.ratio) {
      setTokenTwoAmount((value * prices.ratio).toFixed(2));
    } else {
      setTokenTwoAmount(null);
    }
  }
  const switchTokens = () => {
    setPrices(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);

    const one = tokenOne;
    const two = tokenTwo;

    setTokenOne(two);
    setTokenTwo(one);
    fetchPrices(two.address, one.address);
  }

  const openModal = (asset) => {
    setChangeToken(asset);
    setIsOpen(true);
  }

  const modifyToken = (i) => {
    setPrices(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    if (changeToken === 1) {
      setTokenOne(tokenList[i]);
      fetchPrices(tokenList[i].address, tokenTwo.address);
    } else {
      setTokenTwo(tokenList[i]);
      fetchPrices(tokenOne.address, tokenList[i].address);
    }
    setIsOpen(false);
  }

  const settings = (
    <>
      <div>
        Slippage Tolerance
      </div>
      <div>
        <Radio.Group value={slippage} onChange={handleSlippageChange}>
          <Radio.Button value={0.5}>
            0.5%
          </Radio.Button>
          <Radio.Button value={2.5}>
            2.5%
          </Radio.Button>
          <Radio.Button value={5}>
            5%
          </Radio.Button>
        </Radio.Group>
      </div>
    </>
  )

  return (
    <>
      {contextHolder}
      <Modal
        open={isOpen}
        footer={null}
        onCancel={() => setIsOpen(false)}
        title="Select a token">
        <div className="modalContent">
          {
            tokenList.map((e, i) => {
              return (
                <div
                  className='tokenChoice'
                  key={i}
                  onClick={() => {
                    modifyToken(i)
                  }}>
                  <img
                    src={e.img}
                    alt={e.ticher}
                    className='tokenLogo' />
                  <div className='tokenChoiceNames'>
                    <div className='tokenName'>
                      {e.name}
                    </div>
                    <div className='tokenTicker'>
                      {e.ticker}
                    </div>
                  </div>
                  {e.ticker}
                </div>
              )
            })
          }
        </div>
      </Modal>
      <div className='tradeBox'>
        <div className='tradeBoxHeader'>
          <h4>Swap</h4>
          <Popover
            content={settings}
            title="Settings"
            placement="bottomRight"
            trigger="click">
            <SettingOutlined className="cog" />
          </Popover>
        </div>
        <div className='inputs'>
          <Input
            placeholder='0'
            value={tokenOneAmount}
            onChange={changeAmount}
            disabled={!prices} />
          <Input
            placeholder='0'
            value={tokenTwoAmount}
            disabled={true} />
          <div className='switchButton' onClick={switchTokens}>
            <ArrowDownOutlined className="switchArrow" />
          </div>
          <div className='assetOne' onClick={() => openModal(1)}>
            <img src={tokenOne.img} alt="assetOneLogo" className='assetLogo' />
            {tokenOne.ticker}
            <DownOutlined />
          </div>
          <div className='assetTwo' onClick={() => openModal(2)}>
            <img src={tokenOne.img} alt="assetOneLogo" className='assetLogo' />
            {tokenTwo.ticker}
            <DownOutlined />
          </div>
        </div>
        <div
          className='swapButton'
          disabled={!tokenOneAmount || !isConnected}
          onClick={fetchDexSwap}
        >
          swap
        </div>
      </div>
    </>
  )
}

export default Swap