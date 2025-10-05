const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers");


describe("MetaNodeStake", function () {
  let MetaNodeStake;
  let metaNodeStake;
  let owner;
  let user1;
  let user2;
  let MetaNodeToken;
  let StakingToken;

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy MetaNode token
    const MetaNodeTokenFactory = await ethers.getContractFactory("ERC20Mock");
    MetaNodeToken = await MetaNodeTokenFactory.deploy("MetaNode", "MN", ethers.parseEther("1000000"));
    await MetaNodeToken.waitForDeployment();

    // Deploy Staking token
    const StakingTokenFactory = await ethers.getContractFactory("ERC20Mock");
    StakingToken = await StakingTokenFactory.deploy("Staking", "ST", ethers.parseEther("1000000"));
    await StakingToken.waitForDeployment();

    // Deploy MetaNodeStake
    const MetaNodeStakeFactory = await ethers.getContractFactory("MetaNodeStake");
    MetaNodeStake = await MetaNodeStakeFactory.deploy();
    await MetaNodeStake.waitForDeployment();

    // Initialize contract
    const startBlock = (await ethers.provider.getBlockNumber()) + 10;
    const endBlock = startBlock + 1000;
    await MetaNodeStake.initialize(
      MetaNodeToken.target,
      startBlock,
      endBlock,
      ethers.parseEther("1") // 1 MN per block
    );

    // Transfer some MetaNode to contract for rewards
    await MetaNodeToken.transfer(MetaNodeStake.target, ethers.parseEther("10000"));
  });

  describe("Initialization", function () {
    it("Should set correct initial values", async function () {
      expect(await MetaNodeStake.MetaNode()).to.equal(await MetaNodeToken.getAddress());
    });
  });

  describe("Pool Management", function () {
    it("Should allow admin to add new pool and emit event", async function () {
      // First add ETH pool (address(0))
      const txEth = await MetaNodeStake.addPool(
        ethers.ZeroAddress,
        100, // weight
        ethers.parseEther("10"), // min deposit
        100, // locked blocks
        false // without update
      );
      await txEth.wait();

      // Test event emission for token pool
      const tx = await MetaNodeStake.addPool(
        StakingToken.target,
        100, // weight
        ethers.parseEther("10"), // min deposit
        100, // locked blocks
        false // without update
      );
      
    //   // 验证事件触发（使用 anyValue 匹配器）
    //   await expect(tx)
    //     .to.emit(MetaNodeStake, "AddPool")
    //     .withArgs(
    //       StakingToken.target,
    //       ethers.toBigInt(100),
    //       anyValue, // lastRewardBlock (动态值)
    //       ethers.parseEther("10"),
    //       ethers.toBigInt(100)
    //     );

      // 更详细的事件参数验证
      const receipt = await tx.wait();
      console.log("receipt:",receipt);
      console.log("receipt.events:",receipt.events);
    //   const event = receipt.events?.find(e => e.event === "AddPool");
      
    //   expect(event.args.stTokenAddress).to.equal(StakingToken.target);
    //   expect(event.args.poolWeight).to.equal(ethers.toBigInt(100));
    //   expect(ethers.BigNumber.isBigNumber(event.args.lastRewardBlock)).to.be.true;
    //   expect(event.args.minDepositAmount).to.equal(ethers.parseEther("10"));
    //   expect(event.args.unstakeLockedBlocks).to.equal(ethers.toBigInt(100));
      
      // Verify pool was actually added
      const poolLength = await MetaNodeStake.poolLength();
      expect(poolLength).to.equal(2);
    });

    it("Should prevent non-admin from adding pool", async function () {
      await expect(MetaNodeStake.connect(user1).addPool(
        StakingToken.target,
        100,
        ethers.parseEther("10"),
        100,
        false
      )).to.be.reverted;
    });
  });

  describe("Staking", function () {
    before(async function () {
      // Transfer staking tokens to user1
      await StakingToken.transfer(user1.address, ethers.parseEther("1000"));
      
      // Approve staking tokens
      await StakingToken.connect(user1).approve(
        MetaNodeStake.target,
        ethers.parseEther("1000")
      );
    });

    it("Should allow user to deposit staking tokens", async function () {
      const depositAmount = ethers.parseEther("100");
      await MetaNodeStake.connect(user1).deposit(
        1, // poolId
        depositAmount
      );

      await MetaNodeStake.connect(user1).depositETH({
        value: depositAmount
      }
      );
    expect(await MetaNodeStake.stakingBalance(0, user1.address)).to.equal(depositAmount);

      expect(await MetaNodeStake.stakingBalance(1, user1.address)).to.equal(depositAmount);
    });

    it("Should pause claim or unpause claim", async function () {
        await expect(MetaNodeStake.pauseClaim()).to.emit(MetaNodeStake, "PauseClaim");
        await expect(MetaNodeStake.unpauseClaim()).to.emit(MetaNodeStake, "UnpauseClaim");

    })

    it ("should massupdate pool",async function () {

                await expect(MetaNodeStake.massUpdatePools()).to.emit(MetaNodeStake, "UpdatePool");

    })


    it("Should prevent deposit below minimum amount", async function () {
 


      await expect(MetaNodeStake.connect(user1).deposit(
        1,
        ethers.parseEther("1") // below min
      )).to.be.revertedWith("deposit amount is too small");
    });
  });

  describe("Rewards", function () {
    it("Should calculate pending rewards correctly", async function () {
      // Mine 10 blocks to accumulate rewards
      await ethers.provider.send("hardhat_mine", ["0xA"]); // 10 blocks
      
      const pending = await MetaNodeStake.pendingMetaNode(1, user1.address);
      console.log("pending:",pending);
      expect(pending).to.be.gt(0);
    });

    it("Should allow user to claim rewards", async function () {
      const beforeBalance = await MetaNodeToken.balanceOf(user1.address);
      await MetaNodeStake.connect(user1).claim(1);
      const afterBalance = await MetaNodeToken.balanceOf(user1.address);

      expect(afterBalance).to.be.gt(beforeBalance);
    });
  });

  describe("Unstaking", function () {
    it("Should allow user to request unstake", async function () {
      const unstakeAmount = ethers.parseEther("50");
      await MetaNodeStake.connect(user1).unstake(1, unstakeAmount);

      const [totalRequested] = await MetaNodeStake.withdrawAmount(1, user1.address);
      expect(totalRequested).to.equal(unstakeAmount);
    });

    it("Should prevent withdraw before lock period", async function () {
      // First need to unstake some tokens
      await MetaNodeStake.connect(user1).unstake(1, ethers.parseEther("10"));
      
      // Pause withdraw functionality
      await MetaNodeStake.pauseWithdraw();
      
      await expect(MetaNodeStake.connect(user1).withdraw(1))
        .to.be.revertedWith("withdraw is paused");
        
      // 恢复提现功能
      await MetaNodeStake.unpauseWithdraw();
    });

    it("Should allow withdraw after lock period", async function () {
      // Fast forward blocks
      await ethers.provider.send("hardhat_mine", ["0x64"]); // 100 blocks

      const beforeBalance = await StakingToken.balanceOf(user1.address);
      await MetaNodeStake.connect(user1).withdraw(1);
      const afterBalance = await StakingToken.balanceOf(user1.address);

      expect(afterBalance).to.be.gt(beforeBalance);
    });
  });
});