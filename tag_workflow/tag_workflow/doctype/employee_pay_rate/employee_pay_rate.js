// Copyright (c) 2022, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Employee Pay Rate', {
	onload: (frm)=>{
		if(frappe.boot.tag.tag_user_info.user_type == 'Staffing User'){
			frm.set_df_property('employee_pay_rate', 'read_only', 1);
		}
		$('.form-footer').hide();
	}
});
