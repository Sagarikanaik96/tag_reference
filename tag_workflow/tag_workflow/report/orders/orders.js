// Copyright (c) 2016, SourceFuse and contributors
// For license information, please see license.txt
/* eslint-disable */
frappe.query_reports["Orders"] = {
	"filters": [
		{
			fieldname: 'status',
            label: __('Status'),
            fieldtype: 'Select',
            options: '\nCompleted\nOngoing\nUpcoming',
			width:100,
			reqd:0
		}

	]
};