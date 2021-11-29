// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2021 Dai Foundation
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pragma solidity >=0.7.6;

import {iOVM_L1ERC20Bridge} from "@eth-optimism/contracts/iOVM/bridge/tokens/iOVM_L1ERC20Bridge.sol";
import {iOVM_L2ERC20Bridge} from "@eth-optimism/contracts/iOVM/bridge/tokens/iOVM_L2ERC20Bridge.sol";
import {OVM_CrossDomainEnabled} from "../library/OVM_CrossDomainEnabled.sol";
import "@openzeppelin/contracts-upgradeable/math/SafeMathUpgradeable.sol";

import "../library/Initializable.sol";

interface Mintable {
  function mintMSD(address token, address usr, uint256 wad) external;

  function burn(address usr, uint256 wad) external;
}

// Mint tokens on L2 after locking funds on L1.
// Burn tokens on L1 and send a message to unlock tokens on L1 to L1 counterpart
// Note: when bridge is closed it will still process in progress messages

contract L2USXTokenBridge is Initializable, iOVM_L2ERC20Bridge, OVM_CrossDomainEnabled {
  using SafeMathUpgradeable for uint256;
  // --- Auth ---
  mapping(address => uint256) public wards;

  function rely(address usr) external auth {
    wards[usr] = 1;
    emit Rely(usr);
  }

  function deny(address usr) external auth {
    wards[usr] = 0;
    emit Deny(usr);
  }

  modifier auth() {
    require(wards[msg.sender] == 1, "L2USXTokenBridge/not-authorized");
    _;
  }

  event Rely(address indexed usr);
  event Deny(address indexed usr);

  address public l1Token;
  address public l2Token;
  address public l1USXTokenBridge;
  address public l2msdController;
  uint256 public isOpen;
  uint256 public totalMint;

  event Closed();

  constructor(
    address _l2CrossDomainMessenger,
    address _l2Token,
    address _l1Token,
    address _l1USXTokenBridge,
    address _l2msdController
  ) {
    initialize(_l2CrossDomainMessenger, _l2Token, _l1Token, _l1USXTokenBridge, _l2msdController);
  }

  function initialize(
    address _l2CrossDomainMessenger,
    address _l2Token,
    address _l1Token,
    address _l1USXTokenBridge,
    address _l2msdController
  ) public initializer {
    isOpen = 1;
    wards[msg.sender] = 1;
    emit Rely(msg.sender);

    l2Token = _l2Token;
    l1Token = _l1Token;
    l1USXTokenBridge = _l1USXTokenBridge;
    l2msdController = _l2msdController;
    totalMint = 0;

    __OVM_CrossDomainEnabled_init(_l2CrossDomainMessenger);
  }

  function close() external auth {
    isOpen = 0;

    emit Closed();
  }

  function withdraw(
    address _l2Token,
    uint256 _amount,
    uint32 _l1Gas,
    bytes calldata _data
  ) external virtual override {
    require(_l2Token == l2Token, "L2USXTokenBridge/token-not-USX");

    _initiateWithdrawal(msg.sender, msg.sender, _amount, _l1Gas, _data);
  }

  function withdrawTo(
    address _l2Token,
    address _to,
    uint256 _amount,
    uint32 _l1Gas,
    bytes calldata _data
  ) external virtual override {
    require(_l2Token == l2Token, "L2USXTokenBridge/token-not-USX");

    _initiateWithdrawal(msg.sender, _to, _amount, _l1Gas, _data);
  }

  // When a withdrawal is initiated, we burn the withdrawer's funds to prevent subsequent L2 usage.
  function _initiateWithdrawal(
    address _from,
    address _to,
    uint256 _amount,
    uint32 _l1Gas,
    bytes calldata _data
  ) internal {
    // do not allow initiaitng new xchain messages if bridge is closed
    require(isOpen == 1, "L2USXTokenBridge/closed");

    Mintable(l2Token).burn(msg.sender, _amount);
    totalMint = totalMint.sub(_amount);

    bytes memory message = abi.encodeWithSelector(
      iOVM_L1ERC20Bridge.finalizeERC20Withdrawal.selector,
      l1Token,
      l2Token,
      _from,
      _to,
      _amount,
      _data
    );

    sendCrossDomainMessage(l1USXTokenBridge, _l1Gas, message);

    emit WithdrawalInitiated(l1Token, l2Token, msg.sender, _to, _amount, _data);
  }

  // When a deposit is finalized, we credit the account on L2 with the same amount of tokens.
  function finalizeDeposit(
    address _l1Token,
    address _l2Token,
    address _from,
    address _to,
    uint256 _amount,
    bytes calldata _data
  ) external virtual override onlyFromCrossDomainAccount(l1USXTokenBridge) {
    require(_l1Token == l1Token && _l2Token == l2Token, "L2USXTokenBridge/token-not-USX");

    Mintable(l2msdController).mintMSD(l2Token, _to, _amount);
    totalMint = totalMint.add(_amount);

    emit DepositFinalized(_l1Token, _l2Token, _from, _to, _amount, _data);
  }
}
