import {expect} from 'chai';
import {Str} from '../src/index';

describe('str library', () => {
	it('should correctly invertCase', () => {
		expect(Str.invertCase('SMartprix SmartPhones')).to.equal('smARTPRIX sMARTpHONES');
	});

	it('should correctly plural words', () => {
		expect(Str.plural('smartphone')).to.equal('smartphones');
	});

	it('should correctly transform string', () => {
		expect(Str.transform('abc', 'bc', 'de')).to.equal('ade');
	});

	it('should correctly trimToNext', () => {
		expect(Str.trimToNext('Where left hand json field reference is a superset of the right hand json value or reference', 40, ' ')).to.equal('Where left hand json field reference is a');
	});

	it('should correctly number format', () => {
		expect(Str.numberFormat(12)).to.equal('12');
		expect(Str.numberFormat(1000)).to.equal('1,000');
		expect(Str.numberFormat(1234452.534)).to.equal('1,234,453');
		expect(Str.numberFormat(123456.3443, {decimals: 2})).to.equal('123,456.34');
		expect(Str.numberFormat(123456.3443, {decimals: 2, currency: 'USD'})).to.equal('$123,456.34');
	});
});
