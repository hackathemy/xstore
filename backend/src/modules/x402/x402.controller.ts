import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseFilters,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { FacilitatorService } from '../facilitator/facilitator.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  X402_HEADERS,
  X402PaymentRequired,
  X402PaymentReceipt,
  X402VerificationResult,
  decodeX402PaymentHeader,
  encodeX402Header,
  X402ExceptionFilter,
  X402PaymentRequiredException,
} from '../../common/x402';

// DTOs
class CreateX402PaymentDto {
  @IsString()
  @IsNotEmpty()
  tabId: string;

  @IsString()
  @IsNotEmpty()
  payerAddress: string;

  @IsOptional()
  @IsIn(['USDC', 'USDT'])
  currency?: 'USDC' | 'USDT';
}

class VerifyX402PaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsString()
  @IsNotEmpty()
  txHash: string;
}

class SubmitSponsoredPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @IsString()
  @IsNotEmpty()
  transactionBytes: string;

  @IsString()
  @IsNotEmpty()
  senderAuthenticatorBytes: string;
}

class BuildSponsoredRegistrationDto {
  @IsString()
  @IsNotEmpty()
  senderAddress: string;

  @IsOptional()
  @IsString()
  coinType?: string;
}

class SubmitSponsoredRegistrationDto {
  @IsString()
  @IsNotEmpty()
  transactionBytes: string;

  @IsString()
  @IsNotEmpty()
  senderAuthenticatorBytes: string;

  @IsOptional()
  @IsString()
  coinType?: string;
}

@ApiTags('X402 Payment Protocol')
@Controller('x402')
@UseFilters(X402ExceptionFilter)
export class X402Controller {
  constructor(
    private readonly facilitatorService: FacilitatorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Request payment - Returns HTTP 402 with payment requirements
   * This is the X402 standard entry point
   */
  @Post('request')
  @HttpCode(HttpStatus.PAYMENT_REQUIRED)
  @ApiOperation({ summary: 'Request payment (returns HTTP 402 with payment requirements)' })
  @ApiResponse({
    status: 402,
    description: 'Payment Required - contains X402 payment details',
  })
  async requestPayment(@Body() dto: CreateX402PaymentDto): Promise<X402PaymentRequired> {
    // Get tab with store info
    const tab = await this.prisma.tab.findUnique({
      where: { id: dto.tabId },
      include: { store: true },
    });

    if (!tab) {
      throw new BadRequestException(`Tab with ID ${dto.tabId} not found`);
    }

    if (tab.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Tab is not ready for payment');
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        tabId: dto.tabId,
        payerAddress: dto.payerAddress,
        amount: tab.total,
        tokenAddress: '', // Will be set based on coin type
        status: 'PENDING',
      },
    });

    // Generate X402 payment required response
    const paymentRequired = this.facilitatorService.generateX402PaymentRequired({
      paymentId: payment.id,
      recipient: tab.store.walletAddress,
      amount: tab.total.toString(),
      currency: dto.currency || 'USDC',
    });

    // Update payment with coin type
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { tokenAddress: paymentRequired.payment.coinType },
    });

    // Throw as X402 exception to get proper HTTP 402 response with headers
    throw new X402PaymentRequiredException(paymentRequired);
  }

  /**
   * Get payment requirements without creating a new payment
   * Useful for checking current payment details
   */
  @Get('requirements/:tabId')
  @ApiOperation({ summary: 'Get payment requirements for a tab' })
  async getPaymentRequirements(
    @Headers('x-payer-address') payerAddress: string,
  ): Promise<X402PaymentRequired> {
    // This would typically look up existing pending payment
    // For now, return a sample structure
    return this.facilitatorService.generateX402PaymentRequired({
      paymentId: 'pending',
      recipient: '0x0',
      amount: '0',
      currency: 'USDC',
    });
  }

  /**
   * Verify payment with X-Payment header
   * Standard X402 verification endpoint
   */
  @Post('verify')
  @ApiOperation({ summary: 'Verify payment transaction (X402 protocol)' })
  @ApiHeader({
    name: X402_HEADERS.PAYMENT,
    description: 'Base64 encoded X402 payment header',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment verified - includes X-Payment-Receipt header',
  })
  async verifyPayment(
    @Headers(X402_HEADERS.PAYMENT.toLowerCase()) paymentHeaderEncoded: string,
  ): Promise<X402VerificationResult & { x402Receipt?: X402PaymentReceipt }> {
    if (!paymentHeaderEncoded) {
      throw new BadRequestException('X-Payment header is required');
    }

    // Decode X-Payment header
    const paymentHeader = decodeX402PaymentHeader(paymentHeaderEncoded);

    // Verify payment
    const result = await this.facilitatorService.verifyX402Payment(paymentHeader);

    // If successful, update payment in database
    if (result.valid && result.receipt) {
      await this.prisma.payment.update({
        where: { id: paymentHeader.paymentId },
        data: {
          status: 'COMPLETED',
          txHash: paymentHeader.txHash,
          completedAt: new Date(),
        },
      });

      // Update tab status
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentHeader.paymentId },
        include: { tab: true },
      });

      if (payment) {
        await this.prisma.tab.update({
          where: { id: payment.tabId },
          data: { status: 'PAID' },
        });
      }

      // Return with receipt for interceptor to add to headers
      return {
        ...result,
        x402Receipt: result.receipt,
      };
    }

    return result;
  }

  /**
   * Submit payment - Alternative to header-based verification
   * Accepts payment details in body
   */
  @Post('submit')
  @ApiOperation({ summary: 'Submit payment for verification (body-based)' })
  async submitPayment(
    @Body() dto: VerifyX402PaymentDto,
  ): Promise<X402VerificationResult & { x402Receipt?: X402PaymentReceipt }> {
    // Create a synthetic payment header
    const paymentHeader = {
      paymentId: dto.paymentId,
      payer: '', // Will be filled from payment record
      txHash: dto.txHash,
      timestamp: Date.now(),
    };

    // Get payer from payment record
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
    });

    if (payment) {
      paymentHeader.payer = payment.payerAddress;
    }

    // Verify payment
    const result = await this.facilitatorService.verifyX402Payment(paymentHeader);

    // If successful, update payment in database
    if (result.valid && result.receipt) {
      await this.prisma.payment.update({
        where: { id: dto.paymentId },
        data: {
          status: 'COMPLETED',
          txHash: dto.txHash,
          completedAt: new Date(),
        },
      });

      // Update tab status
      if (payment) {
        await this.prisma.tab.update({
          where: { id: payment.tabId },
          data: { status: 'PAID' },
        });
      }

      return {
        ...result,
        x402Receipt: result.receipt,
      };
    }

    return result;
  }

  /**
   * Get X402 protocol info
   */
  @Get('info')
  @ApiOperation({ summary: 'Get X402 protocol information' })
  async getProtocolInfo() {
    const networkInfo = this.facilitatorService.getNetworkInfo();
    const sponsorshipInfo = await this.facilitatorService.isGasSponsorshipAvailable();

    return {
      protocol: 'X402',
      version: '1.0',
      adapter: 'Movement Network (Move VM)',
      gasSponsorship: {
        enabled: sponsorshipInfo.available,
        facilitatorAddress: sponsorshipInfo.facilitatorAddress,
        facilitatorBalance: sponsorshipInfo.balance,
      },
      network: networkInfo,
      endpoints: {
        request: 'POST /api/x402/request',
        buildSponsored: 'POST /api/x402/build-sponsored',
        submitSponsored: 'POST /api/x402/submit-sponsored',
        verify: 'POST /api/x402/verify',
        submit: 'POST /api/x402/submit',
      },
      headers: {
        payment: X402_HEADERS.PAYMENT,
        receipt: X402_HEADERS.PAYMENT_RECEIPT,
        required: X402_HEADERS.PAYMENT_REQUIRED,
      },
      supportedCurrencies: networkInfo.supportedStablecoins,
      defaultCurrency: 'USDC',
    };
  }

  // ==========================================
  // Gas Sponsorship Endpoints (X402 Standard)
  // ==========================================

  /**
   * Build a sponsored transaction for client to sign
   * Returns transaction bytes that client signs as sender only
   */
  @Post('build-sponsored')
  @ApiOperation({ summary: 'Build sponsored transaction (gas paid by facilitator)' })
  async buildSponsoredTransaction(
    @Body() dto: CreateX402PaymentDto,
  ) {
    // Get tab with store info
    const tab = await this.prisma.tab.findUnique({
      where: { id: dto.tabId },
      include: { store: true },
    });

    if (!tab) {
      throw new BadRequestException(`Tab with ID ${dto.tabId} not found`);
    }

    if (tab.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Tab is not ready for payment');
    }

    // Check if sponsorship is available
    const sponsorshipInfo = await this.facilitatorService.isGasSponsorshipAvailable();
    if (!sponsorshipInfo.available) {
      throw new BadRequestException('Gas sponsorship is not available');
    }

    // Create payment record
    const stablecoin = this.facilitatorService.getPaymentStablecoin();
    const payment = await this.prisma.payment.create({
      data: {
        tabId: dto.tabId,
        payerAddress: dto.payerAddress,
        amount: tab.total,
        tokenAddress: stablecoin.coinType,
        status: 'PENDING',
      },
    });

    // Parse amount to smallest unit
    const amountInSmallestUnit = Math.floor(
      Number(tab.total) * Math.pow(10, stablecoin.decimals)
    ).toString();

    // Build sponsored transaction
    const txData = await this.facilitatorService.buildFeePayerTransaction({
      senderAddress: dto.payerAddress,
      recipient: tab.store.walletAddress,
      amount: amountInSmallestUnit,
      coinType: stablecoin.coinType,
    });

    return {
      paymentId: payment.id,
      transactionBytes: txData.transactionBytes,
      feePayerAddress: txData.feePayerAddress,
      payment: {
        amount: amountInSmallestUnit,
        amountFormatted: tab.total.toString(),
        currency: stablecoin.symbol,
        coinType: stablecoin.coinType,
        decimals: stablecoin.decimals,
        recipient: tab.store.walletAddress,
      },
      message: 'Sign this transaction as sender. Gas will be paid by facilitator.',
    };
  }

  /**
   * Submit a sponsored transaction
   * Client sends signed transaction, facilitator co-signs as fee payer and submits
   */
  @Post('submit-sponsored')
  @ApiOperation({ summary: 'Submit sponsored transaction (gas paid by facilitator)' })
  async submitSponsoredPayment(
    @Body() dto: SubmitSponsoredPaymentDto,
  ): Promise<X402VerificationResult & { x402Receipt?: X402PaymentReceipt }> {
    // Get payment record
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { tab: true },
    });

    if (!payment) {
      throw new BadRequestException(`Payment with ID ${dto.paymentId} not found`);
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment is not in pending state');
    }

    // Submit sponsored transaction
    const result = await this.facilitatorService.submitSponsoredTransaction({
      transactionBytes: dto.transactionBytes,
      senderAuthenticatorBytes: dto.senderAuthenticatorBytes,
      paymentId: dto.paymentId,
    });

    if (result.success && result.txHash) {
      // Update payment record
      await this.prisma.payment.update({
        where: { id: dto.paymentId },
        data: {
          status: 'COMPLETED',
          txHash: result.txHash,
          completedAt: new Date(),
        },
      });

      // Update tab status
      await this.prisma.tab.update({
        where: { id: payment.tabId },
        data: { status: 'PAID' },
      });

      // Generate receipt
      const receipt = this.facilitatorService.generateX402Receipt({
        paymentId: dto.paymentId,
        txHash: result.txHash,
        status: 'verified',
      });

      return {
        valid: true,
        paymentId: dto.paymentId,
        txHash: result.txHash,
        status: 'success',
        receipt,
        x402Receipt: receipt,
      };
    }

    return {
      valid: false,
      paymentId: dto.paymentId,
      txHash: result.txHash || '',
      status: 'failed',
      error: result.error,
    };
  }

  /**
   * Check gas sponsorship availability
   */
  @Get('sponsorship-status')
  @ApiOperation({ summary: 'Check if gas sponsorship is available' })
  async getSponsorshipStatus() {
    return this.facilitatorService.isGasSponsorshipAvailable();
  }

  // ==========================================
  // Sponsored Registration Endpoints
  // For registering coin types with gas sponsorship
  // ==========================================

  /**
   * Build a sponsored registration transaction
   * Allows new users to register for TUSDC without needing MOVE tokens for gas
   */
  @Post('build-sponsored-registration')
  @ApiOperation({ summary: 'Build sponsored registration transaction (gas paid by facilitator)' })
  async buildSponsoredRegistration(
    @Body() dto: BuildSponsoredRegistrationDto,
  ) {
    // Check if sponsorship is available
    const sponsorshipInfo = await this.facilitatorService.isGasSponsorshipAvailable();
    if (!sponsorshipInfo.available) {
      throw new BadRequestException('Gas sponsorship is not available');
    }

    // Use default stablecoin if not specified
    const stablecoin = this.facilitatorService.getPaymentStablecoin();
    const coinType = dto.coinType || stablecoin.coinType;

    // Build sponsored registration transaction
    const txData = await this.facilitatorService.buildSponsoredRegistration({
      senderAddress: dto.senderAddress,
      coinType,
    });

    return {
      transactionBytes: txData.transactionBytes,
      feePayerAddress: txData.feePayerAddress,
      coinType,
      coinSymbol: stablecoin.symbol,
      message: 'Sign this transaction as sender. Gas will be paid by facilitator.',
    };
  }

  /**
   * Submit a sponsored registration transaction
   * Client sends signed transaction, facilitator co-signs as fee payer and submits
   */
  @Post('submit-sponsored-registration')
  @ApiOperation({ summary: 'Submit sponsored registration transaction (gas paid by facilitator)' })
  async submitSponsoredRegistration(
    @Body() dto: SubmitSponsoredRegistrationDto,
  ) {
    // Use default stablecoin if not specified
    const stablecoin = this.facilitatorService.getPaymentStablecoin();
    const coinType = dto.coinType || stablecoin.coinType;

    // Submit sponsored registration transaction
    const result = await this.facilitatorService.submitSponsoredRegistration({
      transactionBytes: dto.transactionBytes,
      senderAuthenticatorBytes: dto.senderAuthenticatorBytes,
      coinType,
    });

    return result;
  }

  // ==========================================
  // Registration Check Endpoints
  // ==========================================

  /**
   * Check if an address is registered for a coin type
   * Store owners must be registered for TUSDC before receiving payments
   */
  @Get('check-registration')
  @ApiOperation({ summary: 'Check if an address is registered for a coin type' })
  async checkRegistration(
    @Query('address') address: string,
    @Query('coinType') coinType?: string,
  ) {
    if (!address) {
      throw new BadRequestException('Address is required');
    }

    const stablecoin = this.facilitatorService.getPaymentStablecoin();
    const targetCoinType = coinType || stablecoin.coinType;

    const isRegistered = await this.facilitatorService.isRegisteredForCoin(address, targetCoinType);

    return {
      address,
      coinType: targetCoinType,
      coinSymbol: stablecoin.symbol,
      isRegistered,
      message: isRegistered
        ? 'Address is registered and can receive payments'
        : 'Address is NOT registered. Must call register<CoinType> before receiving payments.',
    };
  }
}
