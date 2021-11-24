import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { TickerParamsDto } from '~/assets/dto/ticker-params.dto';
import { ApiArrayResponse } from '~/common/decorators/swagger';
import { IsTicker } from '~/common/decorators/validation';
import { IdParamsDto } from '~/common/dto/id-params.dto';
import { ResultsModel } from '~/common/models/results.model';
import { CorporateActionsService } from '~/corporate-actions/corporate-actions.service';
import { createDividendDistributionModel } from '~/corporate-actions/corporate-actions.util';
import { CorporateActionDefaultsModel } from '~/corporate-actions/model/corporate-action-defaults.model';
import { CorporateActionTargetsModel } from '~/corporate-actions/model/corporate-action-targets.model';
import { DividendDistributionModel } from '~/corporate-actions/model/dividend-distribution.model';
import { TaxWithholdingModel } from '~/corporate-actions/model/tax-withholding.model';

class DividendDistributionParamsDto extends IdParamsDto {
  @IsTicker()
  readonly ticker: string;
}

@ApiTags('corporate-actions')
@Controller('assets/:ticker/corporate-actions')
export class CorporateActionsController {
  constructor(private readonly corporateActionsService: CorporateActionsService) {}

  @ApiOperation({
    summary: 'Fetch Corporate Action defaults',
    description:
      "This endpoint will provide the default target Identities, global tax withholding percentage, and per-Identity tax withholding percentages for the Asset's Corporate Actions. Any Corporate Action that is created will use these values unless they are explicitly overridden",
  })
  @ApiParam({
    name: 'ticker',
    description: 'The ticker of the Asset whose Corporate Action defaults are to be fetched',
    type: 'string',
    example: 'TICKER',
  })
  @ApiOkResponse({
    description: 'Corporate Action defaults for the specified Asset',
    type: CorporateActionDefaultsModel,
  })
  @Get('defaults')
  public async getDefaults(
    @Param() { ticker }: TickerParamsDto
  ): Promise<CorporateActionDefaultsModel> {
    const {
      targets,
      defaultTaxWithholding,
      taxWithholdings,
    } = await this.corporateActionsService.findDefaultsByTicker(ticker);
    return new CorporateActionDefaultsModel({
      targets: new CorporateActionTargetsModel(targets),
      defaultTaxWithholding,
      taxWithholdings: taxWithholdings.map(
        taxWithholding => new TaxWithholdingModel(taxWithholding)
      ),
    });
  }

  @ApiOperation({
    summary: 'Fetch Dividend Distributions',
    description:
      'This endpoint will provide the list of Dividend Distributions associated with an Asset',
  })
  @ApiParam({
    name: 'ticker',
    description: 'The ticker of the Asset whose Dividend Distributions are to be fetched',
    type: 'string',
    example: 'TICKER',
  })
  @ApiArrayResponse(DividendDistributionModel, {
    description: 'List of Dividend Distributions associated with the specified Asset',
    paginated: false,
  })
  @Get('dividend-distributions')
  public async getDividendDistributions(
    @Param() { ticker }: TickerParamsDto
  ): Promise<ResultsModel<DividendDistributionModel>> {
    const results = await this.corporateActionsService.findDistributionsByTicker(ticker);
    return new ResultsModel({
      results: results.map(distributionWithDetails =>
        createDividendDistributionModel(distributionWithDetails)
      ),
    });
  }

  @ApiOperation({
    summary: 'Fetch a Dividend Distribution',
    description:
      'This endpoint will provide a specific Dividend Distribution associated with an Asset',
  })
  @ApiParam({
    name: 'ticker',
    description: 'The ticker of the Asset whose Dividend Distribution is to be fetched',
    type: 'string',
    example: 'TICKER',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the Dividend Distribution',
    type: 'string',
    example: '123',
  })
  @ApiOkResponse({
    description: 'The details of the Dividend Distribution',
    type: DividendDistributionModel,
  })
  @Get('dividend-distributions/:id')
  public async getDividendDistribution(
    @Param() { ticker, id }: DividendDistributionParamsDto
  ): Promise<DividendDistributionModel> {
    const result = await this.corporateActionsService.findDistribution(ticker, id);
    return createDividendDistributionModel(result);
  }
}
