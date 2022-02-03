frappe.listview_settings['Claim Order'] = {

    onload(listview) {
        listview.page.clear_primary_action()
        if((listview.filters).length>0 && frappe.boot.tag.tag_user_info.company_type!='Staffing'){
            listview.page.set_secondary_action('Select Head Count', () => refresh(listview), 'octicon octicon-sync');
        }
    },
	hide_name_column: true,
	button: {
		show: function(doc) {
			return doc.name;
		},
		get_label: function() {
			return __('View Profile');
		},
		get_description: function(doc) {
			return __('Open {0}', [`"Claim Order" ${doc.name}`]);
		},
		action: function(doc) {
			frappe.set_route('Form', "Claim Order", doc.name);         

		}
	}
};

function refresh(listview){
    frappe.call({
        method:"tag_workflow.tag_workflow.doctype.claim_order.claim_order.order_details",
        args:{
            'doc_name':listview.data[0].job_order
        },
        callback:function(rm){
            frappe.db.get_value("Job Order",{ name: listview.data[0].job_order},["company",'select_job','from_date','to_date','no_of_workers','per_hour'],function (r) {
                        var data = rm.message;
                        let profile_html = `<table><th>Staffing Company</th><th>Workers</th><th>Approve</th>`;
                        for(let p in data){

                            profile_html += `<tr>
                                <td style="margin-right:20px;" >${data[p].staffing_organization}</td>
                                <td>${data[p].staff_claims_no}</td>
                                <td><input type="number" id="_${data[p].staffing_organization}" min="0" max=${data[p].staff_claims_no}></td>
                                </tr>`;
                        }
                        profile_html+=`</table>`

                        let new_pop_up = new frappe.ui.Dialog({
                            title: "Select Head Count",
                            'fields': [
                                {fieldname: "html_job_title",fieldtype: "HTML",options:"Job Title:" + r['select_job']},
                                {fieldname: "html_per_hour",fieldtype: "HTML",options: "Price:$"+r['per_hour']},
    
                                {'fieldname': 'inputdata2', 'fieldtype': 'Column Break',},
    
                                {fieldname: "html_date",fieldtype: "HTML",options:"Date:"+ r['from_date']+'-' +r['to_date']},                            
                                {fieldname: "html_workers",fieldtype: "HTML",options: "No. Of Workers Required:"+r['no_of_workers']},
                                {'fieldname': 'inputdata1', 'fieldtype': 'Section Break',},
                                {fieldname: "staff_companies",fieldtype: "HTML",options:profile_html},

    
            
                            ],
                            primary_action: function(){
                                new_pop_up.hide();
                                var data_len=data.length
                                var l=0
                                var dict = {}

                                for(let i=0;i<data_len;i++){                                    
                                    y=document.getElementById("_"+data[i].staffing_organization).value
                                    if(y.length==0){
                                        y=0
                                    }
                                    y=parseInt(y)
                                    l=parseInt(l)+parseInt(y)
                            
                                    if(y>data[i].staff_claims_no)
                                    {
                                        frappe.msgprint({
                                            message: __("No Of Workers Exceed For:"+data[i].staffing_organization),
                                            title: __("Error"),
                                            indicator: "red",
                                          });
                                          var dict = {}

                                          setTimeout(function () {
                                            location.reload()                                    
                                          }, 6000);
                                    }
                                    else if(l>r['no_of_workers'])
                                    {
                                        frappe.msgprint({
                                            message: __("No Of Workers Exceed For Then required"),
                                            title: __("Error"),
                                            indicator: "red",
                                          });
                                          var dict = {}

                                          setTimeout(function () {
                                            location.reload()                                    
                                          }, 6000);
                                    }
                                    else{
                                        if(y!=0){
                                            dict[data[i].staffing_organization]=y
                                        }
                                       

                                    }
                                
                                }
                                if(Object.keys(dict).length>0)
                                {
                                    frappe.call({
                                        method:"tag_workflow.tag_workflow.doctype.claim_order.claim_order.save_claims",
                                        args:{
                                            'my_data':dict,
                                            'doc_name':listview.data[0].job_order
                                        },
                                        callback:function(rm){    
                                                frappe.msgprint('Notification send successfully')	
                                        }
                                    })
                                }
                            }
                        })
                        new_pop_up.show();
            })
        }
    })
}
