frappe.ui.form.on("Data Import", {
    before_save: function(frm){
        if(frm.doc.__islocal==1){
            if(frappe.session.user!='Administrator'){
                cur_frm.set_value('user_company',frappe.boot.tag.tag_user_info.company)
            }
            else{
                frappe.db.get_value("User", {organization_type: 'TAG'}, ["company"], function (res) {
                    frm.set_value("user_company", res["company"])
                })
            }
        }
    },
    refresh: function(frm){
        uploaded_file_format(frm);
        data_import_values(frm);
    },
    setup:function(frm){
        frm.set_query("reference_doctype", function() {
			return {
				query: "tag_workflow.utils.data_import.get_import_list",
				filters: {
					user_type: frappe.boot.tag.tag_user_info.company_type,
				},
			};
		});
    },
    reference_doctype:function(frm){
        if(frm.doc.reference_doctype && frm.doc.reference_doctype=='Contact'){
            frm.set_value('import_type','Insert New Records')
            frm.set_df_property('import_type','read_only',1)
        }
        else{
            frm.set_value('import_type','')
            frm.set_df_property('import_type','read_only',0)
        }
    }
}
)
function uploaded_file_format(frm){
    frm.get_field('import_file').df.options = {
        restrictions: {
        allowed_file_types: ['.csv','.xlsx','.xls']
        }
    };
}
function data_import_values(frm){
    if(frm.doc.__islocal==1 && frappe.route_history.length>2 && frappe.boot.tag.tag_user_info.company_type=='Staffing'){
        let histories=frappe.route_history.length
        let get_old_reference=frappe.route_history[histories-3][1]
        if(get_old_reference=='Contact'){
            frm.set_value('reference_doctype','Contact')
            frm.set_value('import_type','Insert New Records')
            frm.set_df_property('import_type','read_only',1)
            frm.set_df_property('reference_doctype','read_only',1)
        }
        else if(get_old_reference=='Employee'){
            frm.set_value('reference_doctype','Employee')
            frm.set_df_property('reference_doctype','read_only',1)
        }
    }
}