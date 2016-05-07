function formatAddress(city, state, zip, swap) {
    var str = '';
    if (swap) {
        str += zip ? zip + '  ' : '';
        str += city ? city.toUpperCase() : '';
        str += (city && state) ? ' ' : (city ? ' ' : '');
        str += '('+state+')';
    } else {
        str += city ? city : '';
        str += (city && state) ? ', ' : (state ? ' ' : '');
        str += state + ' ' + zip;
    }
    return str;
}

NINJA.invoiceLines = function(invoice) {
    var account = invoice.account;
    var total = 0;
    var shownItem = false;
    var hideQuantity = invoice.account.hide_quantity == '1';
    var showItemTaxes = invoice.account.show_item_taxes == '1';

    var grid = [[]];

    if (invoice.has_product_key) {
        grid[0].push({text: invoiceLabels.description, style: ['tableHeader', 'itemTableHeader']});
    }

    //grid[0].push({text: invoiceLabels.description, style: ['tableHeader', 'descriptionTableHeader']});

    if (invoice.is_pro && account.custom_invoice_item_label1) {
        grid[0].push({text: account.custom_invoice_item_label1, style: ['tableHeader', 'custom1TableHeader']});
    }
    if (invoice.is_pro && account.custom_invoice_item_label2) {
        grid[0].push({text: account.custom_invoice_item_label2, style: ['tableHeader', 'custom2TableHeader']});
    }

    if (!hideQuantity) {
        grid[0].push({text: invoiceLabels.quantity, style: ['tableHeader', 'qtyTableHeader']});
    }

    grid[0].push({text: invoiceLabels.unit_cost, style: ['tableHeader', 'costTableHeader']});

    if (showItemTaxes) {
        grid[0].push({text: invoiceLabels.tax, style: ['tableHeader', 'taxTableHeader']});
    }

    grid[0].push({text: invoiceLabels.line_total, style: ['tableHeader', 'lineTotalTableHeader']});

    for (var i = 0; i < invoice.invoice_items.length; i++) {

        var row = [];
        var item = invoice.invoice_items[i];
        var cost = formatMoneyInvoice(item.cost, invoice, false);
        var qty = NINJA.parseFloat(item.qty) ? roundToTwo(NINJA.parseFloat(item.qty)) + '' : '';
        var notes = item.notes;
        var productKey = item.product_key;
        var tax1 = '';
        var tax2 = '';
        var custom_value1 = item.custom_value1;
        var custom_value2 = item.custom_value2;

        if (showItemTaxes) {
            if (item.tax_name1) {
                tax1 = parseFloat(item.tax_rate1);
            }
            if (item.tax_name2) {
                tax2 = parseFloat(item.tax_rate2);
            }
        }

        // show at most one blank line
        if (shownItem && !notes && !productKey && (!cost || cost == '0' || cost == '0.00' || cost == '0,00')) {
            continue;
        }

        shownItem = true;

        // process date variables
        if (invoice.is_recurring) {
            notes = processVariables(notes);
            productKey = processVariables(productKey);
            custom_value1 = processVariables(item.custom_value1);
            custom_value2 = processVariables(item.custom_value2);
        }

        var lineTotal = roundToTwo(NINJA.parseFloat(item.cost)) * roundToTwo(NINJA.parseFloat(item.qty));
        lineTotal = formatMoneyInvoice(lineTotal, invoice);

        rowStyle = (i % 2 == 0) ? 'odd' : 'even';

        /*if (invoice.has_product_key) {
            row.push({style:["productKey", rowStyle], text:productKey || ' '}); // product key can be blank when selecting from a datalist
        }
        row.push({style:["notes", rowStyle], stack:[{text:productKey, text:notes || ' '}]});*/
        row.push({style:[rowStyle], stack:[{style:["productKey"], text:productKey || ' '}, {style:["linenotes"], text:notes || ' '}] });
        if (invoice.is_pro && account.custom_invoice_item_label1) {
            row.push({style:["customValue1", rowStyle], text:custom_value1 || ' '});
        }
        if (invoice.is_pro && account.custom_invoice_item_label2) {
            row.push({style:["customValue2", rowStyle], text:custom_value2 || ' '});
        }

        if (!hideQuantity) {
            row.push({style:["quantity", rowStyle], text:qty || ' '});
        }
        row.push({style:["cost", rowStyle], text:cost});

        if (showItemTaxes) {
            var str = ' ';
            if (tax1) {
                str += tax1.toString() + '%';
            }
            if (tax2) {
                if (tax1) {
                    str += '  ';
                }
                str += tax2.toString() + '%';
            }
            row.push({style:["tax", rowStyle], text:str});
        }
        row.push({style:["lineTotal", rowStyle], text:lineTotal || ' '});

        grid.push(row);
    }

    return NINJA.prepareDataTable(grid, 'invoiceItems');
}


NINJA.clientDetails = function(invoice) {
    var client = invoice.client;
    var data;
    if (!client) {
        return;
    }
    var account = invoice.account;
    var contact = client.contacts[0];
    var clientName = client.name || (contact.first_name || contact.last_name ? (contact.first_name + ' ' + contact.last_name) : contact.email);
    var clientEmail = client.contacts[0].email == clientName ? '' : client.contacts[0].email;

    var cityStatePostal = '';
    var swap = true;
    if (client.city || client.state || client.postal_code) {
        if(client.country) {
            swap = client.country.swap_postal_code;
        }

        cityStatePostal = formatAddress(client.city, client.state, client.postal_code, swap);
    }

    // if a custom field is used in the invoice/quote number then we'll hide it from the PDF
    var pattern = invoice.is_quote ? account.quote_number_pattern : account.invoice_number_pattern;
    var custom1InPattern = (pattern && pattern.indexOf('{$custom1}') >= 0);
    var custom2InPattern = (pattern && pattern.indexOf('{$custom2}') >= 0);

    data = [
        {text:clientName || ' ', style: ['clientName']},
        {text:client.address2},
        {text:client.address1},
        {text:cityStatePostal},
        {text:client.country ? client.country.name : ''},
        {text: client.custom_value1 && !custom1InPattern ? account.custom_client_label1 + ' ' + client.custom_value1 : false},
        {text: client.custom_value2 && !custom2InPattern ? account.custom_client_label2 + ' ' + client.custom_value2 : false}
    ];

    return NINJA.prepareDataList(data, 'clientDetails');
}

NINJA.invoiceColumns = function(invoice)
{
    var account = invoice.account;
    var columns = [];

    /*if (invoice.has_product_key) {
        columns.push("15%");
    }*/

    columns.push("*")

    if (invoice.is_pro && account.custom_invoice_item_label1) {
        columns.push("10%");
    }
    if (invoice.is_pro && account.custom_invoice_item_label2) {
        columns.push("10%");
    }

    var count = 3;
    if (account.hide_quantity == '1') {
        count--;
    }
    if (account.show_item_taxes == '1') {
        count++;
    }
    for (var i=0; i<count; i++) {
        columns.push("14%");
    }

    return columns;
}

NINJA.invoiceDetails = function(invoice) {

    var data = [
        [
            {text: (invoice.is_quote ? invoiceLabels.quote_number : invoiceLabels.invoice_number), style: ['invoiceDetailsLabel']},
            {text: invoice.invoice_number}

        ],
        [
            {text:  (invoice.is_quote ? invoiceLabels.quote_date : invoiceLabels.invoice_date), style: ['invoiceDetailsLabel']},
            {text: invoice.invoice_date}
        ],
        [
            {text: 'Klantnummer', style: ['invoiceDetailsLabel']},
            {text: invoice.client.id_number}
        ],
        [
            {text:  (invoice.is_quote ? 'Vervaldatum' : 'Leverdatum'), style: ['invoiceDetailsLabel']},
            {text: invoice.is_recurring ? processVariables(invoice.custom_text_value1) : invoice.custom_text_value1}
        ]
    ];
/*
    if (invoice.custom_text_value1) {
        data.push([
            {text: invoice.account.custom_invoice_text_label1},
            {text: invoice.custom_text_value1}
        ])
    }
    if (invoice.custom_text_value2) {
        data.push([
            {text: invoice.account.custom_invoice_text_label2},
            {text: invoice.custom_text_value2}
        ])
    }

    var isPartial = NINJA.parseFloat(invoice.partial);

    if (NINJA.parseFloat(invoice.balance) < NINJA.parseFloat(invoice.amount)) {
        data.push([
            {text: invoiceLabels.balance_due},
            {text: formatMoneyInvoice(invoice.amount, invoice)}
        ]);
    } else if (isPartial) {
        data.push([
            {text: invoiceLabels.balance_due},
            {text: formatMoneyInvoice(invoice.total_amount, invoice)}
        ]);
    }

    data.push([
        {text: isPartial ? invoiceLabels.partial_due : invoiceLabels.balance_due, style: ['invoiceDetailBalanceDueLabel']},
        {text: formatMoneyInvoice(invoice.balance_amount, invoice), style: ['invoiceDetailBalanceDue']}
    ])*/

    return NINJA.prepareDataPairs(data, 'invoiceDetails');
}


NINJA.subtotals = function(invoice, hideBalance)
{
    if (!invoice) {
        return;
    }

    var account = invoice.account;
    var data = [];
    data.push([{text: invoiceLabels.subtotal+' (excl. BTW):', bold: true}, {text: formatMoneyInvoice(invoice.subtotal_amount, invoice), bold: true}]);

    if (invoice.discount_amount != 0) {
        data.push([{text: invoiceLabels.discount+':'}, {text: formatMoneyInvoice(invoice.discount_amount, invoice)}]);
    }

    /*if (NINJA.parseFloat(invoice.custom_value1) && invoice.custom_taxes1 == '1') {
        data.push([{text: account.custom_invoice_label1}, {text: formatMoneyInvoice(invoice.custom_value1, invoice)}]);
    }
    if (NINJA.parseFloat(invoice.custom_value2) && invoice.custom_taxes2 == '1') {
        data.push([{text: account.custom_invoice_label2}, {text: formatMoneyInvoice(invoice.custom_value2, invoice)}]);
    }*/

    for (var key in invoice.item_taxes) {
        if (invoice.item_taxes.hasOwnProperty(key)) {
            var taxRate = invoice.item_taxes[key];
            var taxStr = taxRate.name;
            data.push([{text: taxStr+':'}, {text: formatMoneyInvoice(taxRate.amount, invoice)}]);
        }
    }

    if (invoice.tax_amount1) {
        var taxStr = invoice.tax_name1;
        data.push([{text: taxStr+':'}, {text: formatMoneyInvoice(invoice.tax_amount1, invoice)}]);
    }
    if (invoice.tax_amount2) {
        var taxStr = invoice.tax_name2;
        data.push([{text: taxStr+':'}, {text: formatMoneyInvoice(invoice.tax_amount2, invoice)}]);
    }

    /*if (NINJA.parseFloat(invoice.custom_value1) && invoice.custom_taxes1 != '1') {
        data.push([{text: account.custom_invoice_label1}, {text: formatMoneyInvoice(invoice.custom_value1, invoice)}]);
    }
    if (NINJA.parseFloat(invoice.custom_value2) && invoice.custom_taxes2 != '1') {
        data.push([{text: account.custom_invoice_label2}, {text: formatMoneyInvoice(invoice.custom_value2, invoice)}]);
    }*/

    data.push([{text: invoiceLabels.total+' (incl. BTW):', bold: true}, {text: formatMoneyInvoice(invoice.total_amount, invoice), bold: true}]);

    var paid = invoice.amount - invoice.balance;
    if (invoice.account.hide_paid_to_date != '1' || paid) {
        data.push([{text:invoiceLabels.paid_to_date+':'}, {text:formatMoneyInvoice(paid, invoice)}]);
    }

    var isPartial = NINJA.parseFloat(invoice.partial);

    if (!hideBalance || isPartial) {
        data.push([
            { text: invoiceLabels.balance_due+':', style: [isPartial ? '' : 'balanceDueLabel'] },
            { text: formatMoneyInvoice(invoice.total_amount, invoice), style: [isPartial ? '' : 'balanceDue'] }
        ]);
    }

    if (!hideBalance) {
        if (isPartial) {
            data.push([
                { text: invoiceLabels.partial_due+':', style: ['balanceDueLabel'] },
                { text: formatMoneyInvoice(invoice.balance_amount, invoice), style: ['balanceDue'] }
            ]);
        }
    }

    return NINJA.prepareDataPairs(data, 'subtotals');
}