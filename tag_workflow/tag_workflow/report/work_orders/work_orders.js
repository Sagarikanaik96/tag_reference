// Copyright (c) 2016, SourceFuse and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Work Orders"] = {
	"filters": [
		{
			fieldname: 'ongoing',
            label: __('Ongoing Orders'),
            fieldtype: 'Check',
			width:100,
			reqd:0
		},
		{
			fieldname: 'future',
            label: __('Future Orders'),
            fieldtype: 'Check',
			width:100,
			reqd:0
		},
		{
			fieldname: 'closed',
            label: __('Closed Orders'),
            fieldtype: 'Check',
			width:100,
			reqd:0
		}


	]
};
