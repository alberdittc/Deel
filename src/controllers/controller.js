const repository = require('../db/repository');

const getContractByProfileId = async (req, res) => {
    const { id } = req.params
    try {
        const contracts = await repository.getContractByProfileId(id)
        if (contracts.length > 0) {
          res.status(200).send({ contracts });
        } else {
          res.status(204).end();
        }
    } catch(e) {
        res.status(500).send({ message: e.message });
    }
};

const getActiveContracts = async (req, res) => {
  try {
      const contracts = await repository.getActiveContracts()
      if (contracts.length > 0) {
        res.status(200).send({ contracts });
      } else {
        res.status(204).end();
      }
  } catch(e) {
      res.status(500).send({ message: e.message });
  }
};

const getUnpaidJobs = async (req, res) => {
  try {
      const contracts = await repository.getUnpaidJobs()
      if (contracts.length > 0) {
        res.status(200).send({ contracts });
      } else {
        res.status(204).end();
      }
  } catch(e) {
      res.status(500).send({ message: e.message });
  }
};

const updateTransactionJob = async (req, res) => {
  const { job_id } = req.params
  try {
      const contracts = await repository.getUnpaidJobs(job_id)
      if (!contracts.Contract) {
        
        return res.status(404).send({ message: `There is not any job with id ${job_id}` })
      }
      const { id, ClientId, ContractorId } = contracts.Contract.dataValues;
      const job = await repository.paybyJobId(id);
      if (job.price) {
        const { price } = job;
        const profilesBalance = await repository.updateBulk(ClientId, ContractorId, price); // its uses promises all to run both execution at once
        if (profilesBalance[0] === 1 && profilesBalance[1] === 1) {
          return res.status(200).send({ message: `${price} pounds have been paid by the client id ${ClientId} to the contractor id ${ContractorId} for the job id ${job_id}`})
        } else if (!profilesBalance[0] && profilesBalance[1]) {  // It means first promise fail so its need to return the money to the contractor as there was not enough money in client balance
          await repository.rollbackContractorTransaction(ContractorId, price)
          
          return res.status(501).send({ message: `The client id ${ClientId} did not have enough money to pay ${ContractorId} for the job ${job_id} 
                                                  and the transaction was returned`})
        } else if (profilesBalance[0] && !profilesBalance[1]) { // Its need to return the money to the client contractor did not receive the money
          await repository.rollbackClientTransaction(ClientId, price)
          // This scenario will be a really really weird use case, as proises run concurrently
          return res.status(501).send({ message: `There was a problem in the transactions between ${ClientId} and contractor id ${ContractorId} for the job ${job_id}, please check DB`})
        } else { // Any other issue, no transactions have been made, maybe other responses...
          return res.status(501).send({ message: `There was a problem in the transactions between ${ClientId} and contractor id ${ContractorId} for the job ${job_id}, please check DB`})
        } 
      }
      // If relations in DB are invalid ??.. this scenario should never happen
      return res.status(404).send({ message: `There is not any contractId with id ${id}` });
  } catch(e) {
      // Rollback? If any error
      return res.status(501).send({ message: e.message });
  }
};

module.exports = {
  getContractByProfileId,
  getActiveContracts,
  getUnpaidJobs,
  updateTransactionJob
}
