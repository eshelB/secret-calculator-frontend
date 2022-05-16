const getHistory = async ({
  secretjs,
  page,
  pageSize,
  signerAddress,
  cachedSignature,
}) => {
  let signatureFinal = cachedSignature;
  try {
    if (!signatureFinal) {
      console.log("signing permit...");
      ({ signature: signatureFinal } = await window.keplr.signAmino(
        process.env.REACT_APP_CHAIN_ID,
        signerAddress,
        {
          chain_id: process.env.REACT_APP_CHAIN_ID,
          account_number: "0", // Must be 0
          sequence: "0", // Must be 0
          fee: {
            amount: [{ denom: "uscrt", amount: "0" }], // Must be 0 uscrt
            gas: "1", // Must be 1
          },
          msgs: [
            {
              type: "query_permit", // Must be "query_permit"
              value: {
                permit_name: "test",
                allowed_tokens: [process.env.REACT_APP_CONTRACT_ADDRESS],
                permissions: ["calculation_history"],
              },
            },
          ],
          memo: "", // Must be empty
        },
        {
          preferNoSetFee: true, // Fee must be 0, so hide it from the user
          preferNoSetMemo: true, // Memo must be empty, so hide it from the user
        }
      ));
    }

    console.log("getting history on page", page, "with page size", pageSize);

    const result = await secretjs.query.compute.queryContract({
      address: process.env.REACT_APP_CONTRACT_ADDRESS,
      codeHash: process.env.REACT_APP_CONTRACT_HASH,
      query: {
        with_permit: {
          query: {
            calculation_history: {
              page_size: pageSize.toString(),
              page: page.toString()
            }
          },
          permit: {
            params: {
              permit_name: "test",
              allowed_tokens: [process.env.REACT_APP_CONTRACT_ADDRESS],
              chain_id: process.env.REACT_APP_CHAIN_ID,
              permissions: ["calculation_history"]
            },
            signature: signatureFinal,
          }
        }
      },
    });

    console.log(result);
    return [result, signatureFinal];
  } catch (e) {
    console.error("error loading history of calculations", e)
  }
}

module.exports = {
  getHistory,
};