function hide_and_show_tables(frm){
	let roles = frappe.user_roles;
	if(roles.includes('Staffing Admin')|| roles.includes('Tag Admin')){
		frm.set_df_property('_industry_types','hidden',1)
	} 
}

function filter_row(frm){
	frm.fields_dict['job_titles'].grid.get_field('job_titles').get_query = function(doc,cdt,cdn) {
		const row = locals[cdt][cdn];
		let jobtitle = frm.doc.job_titles, title_list = [];
			for (let t in jobtitle){
				if(jobtitle[t]['job_titles']){
					title_list.push(jobtitle[t]['job_titles']);
				}
			}	
		if (row.industry_type){
			return {
				query: "tag_workflow.tag_data.get_jobtitle_based_on_industry",
				filters: {
					industry:row.industry_type,
					company:frm.doc.staffing_company,
					title_list:title_list
				},
			};
		}else{
			return{
				query: "tag_workflow.tag_data.get_jobtitle_based_on_company",
				filters: {
					company:frm.doc.staffing_company,
					title_list:title_list
				},
			}
		}
		
	}
}
function update_table(frm){
		frappe.run_serially([
			()=>frm.clear_table('_industry_types'),
			()=>{
				const industries = frm.doc.job_titles.map(title=>title.industry_type).
				filter((value, index, self) => self.indexOf(value) === index)
				if (industries.length>0){
				industries.map(i=>{
					let row = frm.add_child('_industry_types');
					row.industry_type = i;
				})
			}
				frm.refresh_field('_industry_types')
			},
		])
}

