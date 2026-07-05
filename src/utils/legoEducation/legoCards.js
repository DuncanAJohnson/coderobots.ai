/**
 * The eight LEGO Education connection cards. Each device advertises its
 * BLE name as `<emoji> <4-digit code> <type>` (e.g. "🟩 1234 Single Motor"),
 * where the emoji byte-exactly matches the printed icon on the kit's card.
 *
 * The picker modal shows these cards; the picked emoji is used both as a
 * `namePrefix` filter on `requestDevice` and as a key for auto-reconnecting
 * to previously-paired hardware via `navigator.bluetooth.getDevices()`.
 *
 * `searchName` mirrors the `search_name` field set on each device class
 * inside `/public/lego-education-ble.js`, and is what we validate against
 * `device.name.endsWith(...)` after the user picks a row in the picker.
 */

export const LEGO_CARDS = [
  { id: 'greenSquare',   emoji: '\u{1F7E9}', labelKey: 'legoCard_greenSquare'   },
  { id: 'blueDiamond',   emoji: '\u{1F537}', labelKey: 'legoCard_blueDiamond'   },
  { id: 'redCircle',     emoji: '\u{1F534}', labelKey: 'legoCard_redCircle'     },
  { id: 'orangeDiamond', emoji: '\u{1F536}', labelKey: 'legoCard_orangeDiamond' },
  { id: 'yellowCircle',  emoji: '\u{1F7E1}', labelKey: 'legoCard_yellowCircle'  },
  { id: 'azureHeart',    emoji: '\u{1FA75}', labelKey: 'legoCard_azureHeart'    },
  { id: 'purpleSquare',  emoji: '\u{1F7EA}', labelKey: 'legoCard_purpleSquare'  },
  { id: 'magentaHeart',  emoji: '\u{1FA77}', labelKey: 'legoCard_magentaHeart'  },
];

export const KIND_SEARCH_NAME = {
  singlemotor: 'Single Motor',
  doublemotor: 'Double Motor',
  colorsensor: 'Color Sensor',
  controller:  'Controller',
};

// LEGO's Bluetooth SIG company identifier. The device classes in
// `/public/lego-education-ble.js` mirror this constant — the firmware tags
// every advertisement with manufacturer data under this company id.
export const LEGO_COMPANY_ID = 0x0397;

// 16-bit "product group device" ids from the BLE library (lines 41–44).
// These are what LEGO's own connect chooser uses to disambiguate device
// types in the Web Bluetooth picker via `manufacturerData` filtering.
export const KIND_PRODUCT_ID = {
  singlemotor: 512,
  doublemotor: 513,
  colorsensor: 514,
  controller:  515,
};

