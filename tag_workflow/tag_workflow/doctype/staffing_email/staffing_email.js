// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Staffing Email',"refresh",function(frm) {
	if (frm.doc.__islocal){
	frm.add_custom_button(__("Send"),function(){
		frappe.call({
			"method":"tag_workflow.tag_data.send_email_staffing_user",
			args:{
				email_list:cur_frm.doc.email_recipients,
				subject:cur_frm.doc.subject,
				body:cur_frm.doc.body,
				additional_email:cur_frm.doc.additional_recipients
			},
			callback:function(r){
				if (r.message == '1'){
					cur_frm.remove_custom_button('Send')
					cur_frm.save()
				}
			}
		})
	})
	}
});
