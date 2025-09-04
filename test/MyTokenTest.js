const { ethers } = require("hardhat");
const { expect } = require("chai");


describe("MyToken", function () {
    let myToken;
    let owner;
    let addr1;
    let addr2;
    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const MyToken = await ethers.getContractFactory("MyToken");
        myToken = await MyToken.deploy();
        await myToken.waitForDeployment();
        // console.log("myToken deployed to:", myToken.address);
    })

    describe("Mint", function () {

        it("Should mint a new token", async function () {
            expect(await myToken.name()).to.equal("MyToken");
            expect(await myToken.symbol()).to.equal("MTK");
            expect(await myToken.totalSupply()).to.equal(1000);

        }
        )

        it("Transfer the token to another address", async function () {
            const initialOwnerBalance = await myToken.balanceOf(owner.address);
            const transferAmount = 100;
            
            // 使用transfer方法直接转账(不需要approve)
            await expect(myToken.connect(owner).transfer(addr1.address, transferAmount))
                .to.emit(myToken, "Transfer")
                .withArgs(owner.address, addr1.address, transferAmount);
                
            expect(await myToken.balanceOf(owner.address)).to.equal(BigInt(initialOwnerBalance) - BigInt(transferAmount));
            expect(await myToken.balanceOf(addr1.address)).to.equal(BigInt(transferAmount));
        })

        it("TransferFrom with approval", async function () {
            const transferAmount = 50;
            
            // 1. 先授权给addr1
            await myToken.connect(owner).approve(addr1.address, transferAmount);
            
            // 2. 然后addr1可以从owner账户转账
            await expect(myToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount))
                .to.emit(myToken, "Transfer")
                .withArgs(owner.address, addr2.address, transferAmount);
                
            expect(await myToken.balanceOf(owner.address)).to.equal(950n); // 初始1000 - 第一次转100 - 这次转50
            expect(await myToken.balanceOf(addr2.address)).to.equal(BigInt(transferAmount));
        })

    })

})