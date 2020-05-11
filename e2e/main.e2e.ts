import { expect } from 'chai';
import { SpectronClient } from 'spectron';

import commonSetup from './common-setup';

describe('angular-electron App', () => {
  commonSetup.apply(this);

  let client: SpectronClient;

  beforeEach(() => {
    client = this.app.client;
    browser = client as any;
  });

  it('creates initial windows', async () => {
    const count = await client.getWindowCount();
    expect(count).to.equal(1);
  });

  it('should get the window\'s title!', async () => {
    const text = await client.getTitle()
    expect(text).to.equal('Picture Viewer');
  });

  it ('should open the settings menu', async () => {
    await client.$('div[data-tooltip="Settings"]').click()
    const text = await client.$('.settings h4').getText()
    expect(text).to.equal('Settings')
  })
});
