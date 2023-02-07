'use strict';
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const {ContactFormInfo} = require('../../models')
//Function to get contactus list
const getContactusList = async (req, res) => {
    try {
      const { page, limit, search,searchByStatus } = req.query;
      let offsetValue = parseInt(page) || 0;
      let limitValue = parseInt(limit) || 10;
      let offset = limit * (offsetValue - 1)
      let condition={}
      console.log(searchByStatus,'searchByStatus')
      if(searchByStatus){
        condition={
          ...condition,
          status:searchByStatus
        }
      }
      if (search) {
        condition = {
          ...condition,
          [Op.or]: [
            {
              name:{
                [Op.like]: '%' + search.trim() + '%',
              }
            },
            {
              email: {
                [Op.like]: '%' + search.trim() + '%',
              },
            },
          ],
        };
      }
      console.log(condition,'condition+++++++')
      const result = await ContactFormInfo.findAndCountAll({
        where: condition,
        offset,
        limit: limitValue,
        order: [['createdAt', 'DESC']],
       
      });
      if (!result) {
        return res.status(400).json({
          message: 'No Contact us list founds',
          success: false,
        });
      }
      let pages = Math.ceil(parseInt(result.count) / limitValue);
      return res.status(200).json({
        message: ' Contact us list fetched successfully',
        data: result,
        totalPages: pages,
        success: true,
      });
    } catch (error) {
      console.log(error,'errorrrrrrrr')
      return res.status(500).json({
        message: 'Error while fetching the contact us list ',
        error,
        success: false,
      });
    }
  };

  const changeStatus = async(req, res) =>{
    try {
      const { body } = req
      const { id, status } = body
      if (!id) {
        res.status(400).json("Contact id id not provided")
      }
      console.log(id, status)
      const result = await ContactFormInfo.update(
        {
          status,
          updatedAt: Date.now()
  
        },
        {
          where: {
            id
          }
        }
      )
      res.status(200).json({ message: "Status updated successfully", success:true })
  
    } catch (error) {
      res.status(400).json({ message: 'Unexpected error occured', });
  
    }
  }

  module.exports={
    getContactusList,
    changeStatus
  }