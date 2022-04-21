// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on("Staffing Email", {
	refresh: function (frm) {
		$('.form-footer').hide()
		frm.disable_save();
		if (frm.doc.__islocal) {
			frm.add_custom_button(__("Send"), function () {
				frappe.call({
					method: "tag_workflow.tag_data.send_email_staffing_user",
					args: {
						user: frappe.session.user,
						company_type: frappe.boot.tag.tag_user_info.company_type,
						email_list: cur_frm.doc.email_recipients,
						subject: cur_frm.doc.subject,
						body: cur_frm.doc.body,
						additional_email: cur_frm.doc.additional_recipients,
					},
					callback: function (r) {
						if (r.message == "1") {
							cur_frm.remove_custom_button("Send");
							cur_frm.save();
						}
					},
				});
			});
		}
		let child_table=['email_recipients', 'email'];
		for(let i in child_table){
			$( "[data-fieldname="+child_table[i]+"]" ).on('mouseover',function(e) {
				let file=e.target.innerText;
				$(this).attr('title', file);
			});
		}
	},
	setup: function (frm) {
		frm.disable_save();
		if (frappe.boot.tag.tag_user_info.company_type == "Staffing") {
			frm.fields_dict.email_recipients.grid.get_field("email_recipients").get_query = function () {
				let recipientsdata = frm.doc.email_recipients, recipients_list = [];
				for(let i in recipientsdata){
					if(recipientsdata[i]['email_recipients']){
						recipients_list.push(recipientsdata[i]['email_recipients'])
					}
				}
				return {
					query: "tag_workflow.tag_data.email_recipient",
					filters: { company: frappe.defaults.get_user_default("Company"), recipients_list: recipients_list },
				};
			};
		}
	},
	onload: function(){
		if(frappe.session.user != 'Administrator'){
            $('.menu-btn-group').hide()
        }
	}
});
