//
//  QMAPoi.h
//  QMA-AR
//
//  Created by JB DeLima on 5/22/14.
//  Copyright (c) 2014 GuideOne. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class QMATarget;

@interface QMAPoi : NSManagedObject

@property (nonatomic, retain) NSString * name;
@property (nonatomic, retain) NSNumber * order;
@property (nonatomic, retain) QMATarget *target;

@end
