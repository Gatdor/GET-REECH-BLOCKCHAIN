package main

import (
    "encoding/json"
    "fmt"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type SmartContract struct {
    contractapi.Contract
}

type Catch struct {
    ID         string `json:"id"`
    FishermanID string `json:"fisherman_id"`
    Species    string `json:"species"`
    Weight     float64 `json:"weight"`
    Location   string `json:"location"`
    Timestamp  string `json:"timestamp"`
    Status     string `json:"status"` // pending, verified, sold
    AdminID    string `json:"admin_id"`
}

func (s *SmartContract) CreateCatch(ctx contractapi.TransactionContextInterface, id, fishermanID, species string, weight float64, location, timestamp string) error {
    catch := Catch{
        ID:         id,
        FishermanID: fishermanID,
        Species:    species,
        Weight:     weight,
        Location:   location,
        Timestamp:  timestamp,
        Status:     "pending",
        AdminID:    "",
    }
    catchJSON, err := json.Marshal(catch)
    if err != nil {
        return err
    }
    return ctx.GetStub().PutState(id, catchJSON)
}

func (s *SmartContract) VerifyCatch(ctx contractapi.TransactionContextInterface, id, adminID string) error {
    catchJSON, err := ctx.GetStub().GetState(id)
    if err != nil || catchJSON == nil {
        return fmt.Errorf("catch %s does not exist", id)
    }
    catch := Catch{}
    err = json.Unmarshal(catchJSON, &catch)
    if err != nil {
        return err
    }
    catch.Status = "verified"
    catch.AdminID = adminID
    catchJSON, err = json.Marshal(catch)
    if err != nil {
        return err
    }
    return ctx.GetStub().PutState(id, catchJSON)
}

func (s *SmartContract) QueryCatch(ctx contractapi.TransactionContextInterface, id string) (*Catch, error) {
    catchJSON, err := ctx.GetStub().GetState(id)
    if err != nil || catchJSON == nil {
        return nil, fmt.Errorf("catch %s does not exist", id)
    }
    catch := &Catch{}
    err = json.Unmarshal(catchJSON, catch)
    if err != nil {
        return nil, err
    }
    return catch, nil
}

func (s *SmartContract) UpdateCatchStatus(ctx contractapi.TransactionContextInterface, id, status string) error {
    catchJSON, err := ctx.GetStub().GetState(id)
    if err != nil || catchJSON == nil {
        return fmt.Errorf("catch %s does not exist", id)
    }
    catch := Catch{}
    err = json.Unmarshal(catchJSON, &catch)
    if err != nil {
        return err
    }
    catch.Status = status
    catchJSON, err = json.Marshal(catch)
    if err != nil {
        return err
    }
    return ctx.GetStub().PutState(id, catchJSON)
}

func main() {
    chaincode, err := contractapi.NewChaincode(&SmartContract{})
    if err != nil {
        fmt.Printf("Error creating chaincode: %v", err)
        return
    }
    if err := chaincode.Start(); err != nil {
        fmt.Printf("Error starting chaincode: %v", err)
    }
}