/* istanbul ignore file */

import { ApiProperty } from '@nestjs/swagger';

export class ConfidentialProofModel {
  @ApiProperty({
    description: 'The asset id the proof is for',
    type: 'string',
    example: '76702175-d8cb-e3a5-5a19-734433351e25',
  })
  public readonly asset: string;

  @ApiProperty({
    description: 'The confidential proof submitted for the asset',
    type: 'string',
    example:
      '0x0c8679dfb2fb4b98713d5856c1870770de357e429028987ab859a99b285256d75898670786a35ba11445f8fde8da53e956d9d4743dce4113afdbb692ae88c48224f2a7f8714c92e148b58670383cb8aa8c1320116b9cb94bcaac4753ec7f319b7f7a98813e0c8581a8216da15d1a794f8b0c492b68d22000db7d72c6f56ced74320d110c32abea41289d9bc4606ceee1148b785984554f7adbbaf91dbf28f6a18eb2685edc3570aa8d06c24bb5f2e71425a86f8d8fa43f63376ad586f8999f7b16a9397184231d64099d44b960b60c9752efafd139534209ec2e7457cb0b621cb9b1ad4a2aa7a136c4bf69839b0b2c9f59bf216e2ebae525c45a4433c1b241b65db65a75196b0d656d4d11fcd16ffb634e256860f6c4b63d4e90e9be09d204a0b876a80dfed4d077f6d00d61ef816c6260e93b760e68c9eceb7ce9c441fc48d2b4fffb066889aaa2872e53dceced05fdbc96e2c42940dc950ebb30d739e26592d5b90534cab2b9444069059728c8a51d1939195f89e40b25f50d936c6d9031b9e4a3f126a2b16dfe45d6b806c54148b280afbb68c57fe3ef61165289da2afd8a05d4f2057ad6c3bf572f6b49144387e9e843b298074ed54fb20ee2a919e88fef74379159e529fa37f6636793c5ceccecb5040e18b91345fe0eb2ce8ce83e5b60abc32100810b9c15fd8b63161ff212489dee9e533203d5966ae7c76e622a1736212ab33fac72b6f2fbe7b05cda2d57228144ff9291938e3460be48b0a51150796bac708a4d3d3894fd290c7185b8fa259a474a8034ddb1633f06d65f11cddc412b15c38a5c2fdeb6f5f38d1fd7442741d3af19e5c3a875b5c622c57902d618a4f6237e6a076cccbd24b1969fb8a054c9d325c009ac760dec099379a730f1ed172e9a75ed290bc619301d8c45e2ae4a46c989330ea675e5c45475ffd79fd290f036d23a6ec0050b2291cfb84d7cbfb6c9a45cbfa97d93276d9c6ebf9dc3d935f28c55bf070c09ee440d32f634a7b0da18f147108ec0c31ca2d659e7194d73f6cfc2ab90485807360ee4fa510b7af93a0939c43a27d2a133e2464a178ce16eb3020ba14f52f4666a90117bf02c61843dc37dadf8fb4639e56f0f72fd0f3ebb897ec1accbffb62a4e5b44e6b048486d174fcd4f715179b5da03f897f7936dd373b6d3ead0b13700eccd1aa8aa51c8a63cd201094571f5358b79f0f118a296c5fe59e86df6b85d67388d6fb459913811c54ac6f8dc1030127ed874f2efdc718c0763841fdd9afe2150c6f6b3e8c77a166370416255a1fc601882a3d2d37f60864b793696ed02c95326a8d15572a61522063d30ac7a36280be1206139502ecc3a5b283a00d953316e105afdb863c74ca3d08be4cc1da3191e8d08dd0b12aa6fb56bb2b5d70e5fc86fe07bd45db98d8e6b5a65856f9b29c119cb0e64f5c0399230a25b5542473dc567a4d97945219e697063926fe80c6ee94215faf33edfa335ff8a20deda1f6e2676566cf821268d2432cf990ad62f43fdb22b7790e340ee8028a5aa1f0d381bd30806fd876ff5eb92f1a105a76103377cbd86182d224da20448806d20a408cfb651c88e8500a96c536385ed19a36eeff32878d13cc93fabe5a3f961db996187ef46ac2d2b8fe35f556033b278a0ea66b80e7d6ddb486d05c7f08840ecee4150110361bfe78c9f51185f7e30cd07d00343c52e46d08c317f5a0dca17970b0d841704',
  })
  public readonly proof: string;

  constructor(model: ConfidentialProofModel) {
    Object.assign(this, model);
  }
}
