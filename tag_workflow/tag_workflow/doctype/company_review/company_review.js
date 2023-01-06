// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Company Review', {
	refresh: function() {
		staffing_review();
		$('.form-footer').hide();
	}
});
