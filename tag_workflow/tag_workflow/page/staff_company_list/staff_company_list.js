frappe.pages['staff_company_list'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Staff Company List',
		single_column: true
	});
	wrapper.face_recognition = new frappe.FaceRecognition(wrapper, page);
}
frappe.FaceRecognition = Class.extend({
		init: function(wrapper, page) {
			var me = this;
			this.parent = wrapper;
			this.page = this.parent.page;
			setTimeout(function() {
				me.setup(wrapper, page);
			}, 0);
		},
		setup: function(wrapper, page){
			var me = this;
			this.body = $('<div></div>').appendTo(this.page.main);
			$(frappe.render_template('staff_company_list', "")).appendTo(this.body);
			me.show_profile(wrapper,page);
		},
		show_profile: function(wrapper, page){
			frappe.call({
				method:"tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.comp",
				args:{
					company_name:frappe.boot.tag.tag_user_info.company,
				},
				
				callback:function(r){

					var data = r.message;
					let profile_html = ``;
					for(let p in data){
						profile_html += `<tr>
							<td>${parseInt(p)+1}</td>
							<td ><a href=javascript:get_location(${parseInt(p)+1})>${data[p].name}</a></td>
							<td>${data[p].address}</td>
							<td>${data[p].city}</td>
							<td>${data[p].state}</td>
							<td>${data[p].zip}</td>
							<td>${data[p].average_rating}</td>
							</tr>`;
					}
					$("#myTable").html(profile_html);
				}
				})
		},
	})


function get_location(name){
	frappe.call({
		method:"tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.comp",
		args:{

			"comp_id":name,
			company_name:frappe.boot.tag.tag_user_info.company,

		},	
		callback:function(r){
			let company_data=r.message[0][0]
			let company_industry=r.message[1]
			let company_member=r.message[2]
			let company_review=r.message[3]
			const data=`
			<table>
				<tr>
					<td> 
						<img src="${company_data['company_logo']}" style="height:50px;width:50px;">
					</td>
					<td>
						<h3>${company_data['name']}</h3><h5>${company_data['address']},${company_data['city']}</h5><h4>${company_data['state']},${company_data['zip']}</h4>
					</td>
					<td>
						<h3><span>&starf;</span>${company_data['average_rating']}</h3>
						<a href=javascript:new_job_order(${name})><button>Place Order</button></a>
					</td>
				</tr>
				<tr>
					<td colspan=3><h4 style="font-size:20px">About</h4>
						${company_data['about_organization']}
					</td>
				</tr>
			</table>`

			let industry = `<h3>Serving Industries</h3>`;
			for(let i in company_industry){
				industry += `${company_industry[i].industry_type}<br>`;
			}
			
			let team = `<h3>Team Member</h3>`;
			for(let m in company_member){
				team += `${company_member[m].first_name} ${company_member[m].last_name}<br>`;
			}

			let review = `<h3>Review And Rating</h3>`;
			for(let c in company_review){
				review += `
				<b>${company_review[c].first_name} ${company_review[c].last_name}</b><br><b><span>&starf;</span>${company_review[c].rating}</b><br>${company_review[c].comments}<br>${company_review[c].creation}<br>`;
			}

			$("#listdata").html(data);
			$("#industrydata").html(industry);
			$("#teamdata").html(team);
			$("#compreview").html(review);			
		}
	})
}
function new_job_order(nam){
	frappe.call({
		method:"tag_workflow.tag_workflow.page.staff_company_list.staff_company_list.comp",
		args:{
			company_name:frappe.boot.tag.tag_user_info.company,
		},
		callback:function(r)
		{
			let doc = frappe.model.get_new_doc("Job Order");
			doc.company = frappe.defaults.get_user_defaults('Company')[0]
			doc.staff_company = r.message[nam-1]['name']
			doc.posting_date_time = frappe.datetime.now_date();  
			frappe.set_route("Form", doc.doctype, doc.name);
		}
	})
}
