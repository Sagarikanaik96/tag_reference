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

        let html_employee = `<span>Note: Bold Indicates required field</span><br><br><li> <strong>First Name</strong>: Max 140 characters, Alphanumeric</li>
        <li><strong>Last Name</strong>: Max 140 characters, Alphanumeric</li>
        
        <li><strong>Email</strong>: Max 140 characters, Alphanumeric &amp; formatted as <span style="color:#0052CC">abc@xyz.com</span></li>
        
        <li><strong>Company</strong>: The company as spelled within TAG and that the temp employee should be created. You can only add temp employees &nbsp;&nbsp;&nbsp;&nbsp; for companies you assigned.</li>
        
        <li><strong>Date of Birth</strong>: yyyy-MM-dd</li>
        
        <li><strong>Status</strong> : Active/Inactive/Suspended/Left</li>
        
        <li>Contact Number: Numbers only. 10 characters</li>
        
        <li>Gender: Female/Male/Decline to answer</li>
        
        <li>SSN: 9 numbers</li>
        
        <li>Military Veteran : 0 or blank for False; 1 for True</li>
        
        <li>Street Address: Max 255 characters, Alphanumeric</li>
        
        <li>Suite/Apartment Max 140 characters, Alphanumeric</li>
        
        <li>City : Max 255 characters, Alphanumeric</li>
        
        <li>State: Full spelling (ex: Florida)</li>
        <li>Zip : 5 characters, Numeric</li>`
        
        let html_contact = `<span>Note: Bold Indicates required field</span><br><br>

        <li><strong>Company Name</strong>: Max 140 characters, Alphanumeric and special characters</li>
        
        <li><strong>Contact Name</strong>: Max 140 characters, Alphanumeric and special characters</li>
        
        <li><strong>Phone Number</strong>: Numbers only. 10 characters</li>
        
        <li><strong>Email Address</strong>: Max 140 characters, Alphanumeric and special characters</li>
        
        <li>Address: Max 140 characters, Alphanumeric and special characters</li>
        
        <li>City: Max 140 characters, Alphanumeric and special characters</li>
        
        <li>State: Full spelling (ex: Florida)</li>
        
        <li>Zip: 5 characters, Numeric</li>
        
        <li>Is Primary: 0 for False, 1 for True</li>`

        if(frm.doc.reference_doctype && frm.doc.reference_doctype=='Contact'){
            frm.set_value("import_requirements",html_contact)
            frm.get_field("import_requirements").$wrapper.html(html_contact);
            frm.refresh_field("import_requirements")
        }
        
        if(frm.doc.reference_doctype && frm.doc.reference_doctype=='Employee'){
            frm.set_value("import_requirements",html_employee)
            frm.get_field("import_requirements").$wrapper.html(html_employee);
            frm.refresh_field("import_requirements")
        }

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