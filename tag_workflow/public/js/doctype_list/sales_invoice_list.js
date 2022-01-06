frappe.listview_settings['Sales Invoice'] = {
	hide_name_column: true,
	// add_fields: ['type', 'reference_doctype', 'reference_name'],
	button: {
		show: function(doc) {
			return doc.name;
		},
		get_label: function() {
			return __('View Invoice');
		},
		get_description: function(doc) {
			return __('Open {0}', [`"Sales Invoice" ${doc.name}`]);
		},
		action: function(doc) {
			frappe.set_route('print', "Sales Invoice", doc.name);
		}
	}
};