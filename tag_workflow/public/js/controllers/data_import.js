frappe.ui.form.off("Data Import", "show_import_warnings");
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
    },
    show_import_warnings(frm, preview_data) {
		let warnings = JSON.parse(frm.doc.template_warnings || "[]");
		warnings = warnings.concat(preview_data.warnings || []);
        
		// group warnings by row
		let warnings_by_row = {};
		let other_warnings = [];
		for (let warning of warnings) {
            if (warning.row) {
                warnings_by_row[warning.row] = warnings_by_row[warning.row] || [];
				warnings_by_row[warning.row].push(warning);
			} else {
                other_warnings.push(warning);
			}
		}
        if(frm.doc.import_file){
            other_warnings = reqd_fields_missing(frm.doc.reference_doctype, preview_data, other_warnings);
        }
        frm.toggle_display("import_warnings_section", warnings.length > 0 || other_warnings.length > 0);
        if (warnings.length === 0 && other_warnings.length === 0 ) {
            frm.get_field("import_warnings").$wrapper.html("");
            return;
        }
        let html = show_import_warnings_contd(frm, preview_data, warnings_by_row, other_warnings);
		frm.get_field("import_warnings").$wrapper.html(`
			<div class="row">
				<div class="col-sm-10 warnings">${html}</div>
			</div>
		`);
	}
})

function show_import_warnings_contd(frm, preview_data, warnings_by_row, other_warnings){
    let html = "";
    let columns = preview_data.columns;
    html += Object.keys(warnings_by_row)
        .map((row_number) => {
            let message = warnings_by_row[row_number]
                .map((w) => {
                    if (w.field) {
                        let label =
                            w.field.label +
                            (w.field.parent !== frm.doc.reference_doctype
                                ? ` (${w.field.parent})`
                                : "");
                        return `<li>${label}: ${w.message}</li>`;
                    }
                    return `<li>${w.message}</li>`;
                })
                .join("");
            return `
            <div class="warning" data-row="${row_number}">
                <h5 class="text-uppercase">${__("Row {0}", [row_number])}</h5>
                <div class="body"><ul>${message}</ul></div>
            </div>
        `;
        })
        .join("");

    html += other_warnings
        .map((warning) => {
            let header = "";
            if (warning.col) {
                let column_number = `<span class="text-uppercase">${__("Column {0}", [
                    warning.col,
                ])}</span>`;
                let column_header = columns[warning.col].header_title;
                header = `${column_number} (${column_header})`;
            }
            return `
                <div data-col="${warning.col}">
                    <h5>${header}</h5>
                    <div class="body">${warning.message}</div>
                </div>
            `;
        })
        .join("");
    return html;
}

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

function reqd_fields_missing(doctype, preview_data, other_warnings){
    let columns = preview_data.columns;
    let res = missing_col(doctype, columns, other_warnings);
    let mandatory_fields = res[0];
    other_warnings = res[1];
    if(mandatory_fields.length>0){
        for(let col in columns){
            if(!columns[col].df){
                continue;
            }
            else{
                other_warnings=reqd_row_missing(preview_data, col, columns, mandatory_fields, other_warnings);
            }
        }
    }
    return other_warnings;
}

function reqd_row_missing(preview_data, col, columns, mandatory_fields, other_warnings){
    let missing_rows = '';
    let row = preview_data.data;
    if(mandatory_fields.includes(columns[col].df.label)){
        for(let data in row){
            missing_rows+=!row[data][col]?'<li>Row '+(parseInt(data)+1)+'</li>':'';
        }
        if(missing_rows!='')
            other_warnings.push({'missing_col': 1, 'message': '<h5>Missing Required Field COLUMN '+col+' ('+columns[col].df.label+')</h5><ul>'+missing_rows+'</ul>'})
    }
    return other_warnings;
}

function missing_col(doctype, columns, other_warnings){
    let mandatory_fields = [];
    let column = [];
    if(doctype == 'Employee'){
        mandatory_fields = ['First Name', 'Last Name', 'Email', 'Company', 'Date of Birth', 'Status'];
    }else if(doctype == 'Contact'){
        mandatory_fields = ['Owner Company', 'Contact Name', 'Phone Number', 'Email'];
    }
    for(let col in columns){
        if(columns[col].df && mandatory_fields.includes(columns[col].df.label)){
            column.push(columns[col].df.label);
        }
    }
    let difference = column != mandatory_fields && mandatory_fields.length>0 ? mandatory_fields.filter(x => !column.includes(x)) : [];
    for(let col in difference){
        other_warnings.push({'missing_col': 1, 'message': '<h5>Missing Required COLUMN: '+difference[col]+'</h5>'});
    }
    return [mandatory_fields, other_warnings];
}
