frappe.ui.form.on("Company", {
	refresh: function(frm){
		if(frappe.user_roles.includes("System Manager")){
			cur_frm.toggle_display("organization_type", 1);
		}else{
			if(cur_frm.doc.__islocal == 1){
				cur_frm.toggle_display("organization_type", 1);
			}else{
				cur_frm.toggle_display("organization_type", 0);
			}
		}
	},
	setup: function(frm){
		frm.set_query("organization_type", function(doc){
			if(frappe.user_roles.includes('Tag Admin')){
				return {
					filters: [
						["Organization Type", "name", "!=", "Exclusive Hiring"]
					]
				}
			}else if(frappe.user_roles.includes('Staffing Admin')){
				return {
					filters: [
						["Organization Type", "name", "=", "Exclusive Hiring"]
					]
				}
			}else if(frappe.user_roles.includes('Hiring Admin')){
				return {
					filters: [
						["Organization Type", "name", "=", "Hiring"]
					]
				}
			}
		});
	}
});
