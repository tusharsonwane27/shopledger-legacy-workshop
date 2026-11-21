var test = require('node:test');
var assert = require('node:assert/strict');

var invoice = require('../lib/invoice');
var pricing = require('../lib/pricing');

test('INVOICE CORRECT BEHAVIOUR: figures match stored order pricing for HSN GST and coupon', function () {
  var items = [{ id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 1000, qty: 1 }];
  var billed = pricing.computeTotals(items, 'SAVE10');
  var printed = invoice.computeInvoiceFigures({ items: items, coupon: 'SAVE10' });

  assert.deepEqual(
    { subtotal: printed.subtotal, discount: printed.discount, tax: printed.tax, cgst: printed.cgst, sgst: printed.sgst, total: printed.total },
    { subtotal: billed.subtotal, discount: billed.discount, tax: billed.tax, cgst: billed.cgst, sgst: billed.sgst, total: billed.total }
  );
  assert.equal(printed.rows[0].gstPercent, billed.lines[0].gstPercent);
  assert.equal(printed.rows[0].lineTax, billed.lines[0].tax);
});

test('INVOICE BEHAVIOUR: HSN pricing and invoice GST calculations agree', function () {
  var items = [{ id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 100, qty: 1 }];

  var billed = pricing.computeTotals(items, '');
  var printed = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.deepEqual(
    { tax: billed.tax, total: billed.total },
    { tax: 5, total: 105 }
  );
  assert.deepEqual(
    { tax: printed.tax, total: printed.total, rowRate: printed.rows[0].gstPercent },
    { tax: 5, total: 105, rowRate: 5 }
  );
});

test('INVOICE BEHAVIOUR: percent coupon matches order discount and post-discount tax', function () {
  var items = [{ id: 1, name: 'Staples', hsn: '1006', price: 1000, qty: 1 }];

  var billed = pricing.computeTotals(items, 'SAVE10');
  var printed = invoice.computeInvoiceFigures({ items: items, coupon: 'SAVE10' });

  assert.deepEqual(
    { discount: billed.discount, tax: billed.tax, total: billed.total },
    { discount: 100, tax: 45, total: 945 }
  );
  assert.deepEqual(
    { discount: printed.discount, tax: printed.tax, total: printed.total },
    { discount: 100, tax: 45, total: 945 }
  );
});

test('INVOICE BEHAVIOUR: decimal gstRate matches pricing rate interpretation', function () {
  var items = [{ id: 1, name: 'Tea', price: 100, qty: 1, gstRate: 0.05 }];

  var billed = pricing.computeTotals(items, '');
  var printed = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.deepEqual(
    { tax: billed.tax, rate: billed.lines[0].gstPercent },
    { tax: 5, rate: 5 }
  );
  assert.deepEqual(
    { tax: printed.tax, rate: printed.rows[0].gstPercent },
    { tax: 5, rate: 5 }
  );
});

test('INVOICE BEHAVIOUR: rendered invoice total matches ledger without mismatch notice', function () {
  var html = invoice.render({
    id: 7,
    date: '2026-11-21',
    total: 105,
    items: [{ name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 100, qty: 1 }]
  });

  assert.match(html, /Invoice Total<\/td><td class="r">₹105\.00/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
